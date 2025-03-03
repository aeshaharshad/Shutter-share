// Import Firebase modules
import { db, auth, collection, getDocs, query, where, doc, deleteDoc } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Debug function
function logData(message, data) {
    console.log(`%c${message}`, 'background: #333; color: #bada55', data);
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("📱 App.js loaded");

    const photoGrid = document.getElementById("photo-grid");
    const loadingSpinner = document.getElementById("loading");
    const noMoreContent = document.getElementById("no-more-content");
    const searchInput = document.querySelector(".search-bar input");

    // Ensure elements exist before using them
    function safeDisplay(element, displayStyle) {
        if (element) {
            element.style.display = displayStyle;
        }
    }

    let allPhotos = [];
    let filteredPhotos = [];
    let page = 1;
    const photosPerPage = 6;
    let totalPages = 1;
    let isLoading = false;

    // Add search functionality
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const searchTerm = searchInput.value.toLowerCase();
            if (allPhotos.length > 0) {
                filteredPhotos = allPhotos.filter(photo =>
                    (photo.photoName && photo.photoName.toLowerCase().includes(searchTerm)) ||
                    (photo.album && photo.album.toLowerCase().includes(searchTerm))
                );

                if (photoGrid) {
                    photoGrid.innerHTML = "";
                    page = 1;
                    totalPages = Math.ceil(filteredPhotos.length / photosPerPage);
                    displayPhotos(filteredPhotos);
                }
            }
        });
    }

    // Fetch uncategorized photos from Firestore for index.html
    window.fetchPhotosFromFirestore = async function() {
        console.log("📸 Fetching uncategorized photos from Firestore...");

        if (!photoGrid) {
            console.error("❌ Photo grid not found!");
            return;
        }

        // Clear the grid first
        photoGrid.innerHTML = "";

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error("❌ User not authenticated!");
                photoGrid.innerHTML = "<p class='no-auth'>Please sign in to view photos.</p>";
                return;
            }

            try {
                const querySnapshot = await getDocs(collection(db, "photos"));
                allPhotos = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.userId === user.uid && data.album === "Uncategorized") {
                        allPhotos.push({
                            id: doc.id,
                            src: data.imageUrl,
                            album: "Uncategorized",
                            photoName: data.photoName || "Unnamed Photo",
                            timestamp: data.timestamp ? data.timestamp.toDate().toLocaleString() : "Just now"
                        });
                    }
                });

                filteredPhotos = [...allPhotos];
                totalPages = Math.ceil(allPhotos.length / photosPerPage);
                console.log(`📊 Total Uncategorized Photos: ${allPhotos.length}`);

                page = 1;
                displayPhotos(filteredPhotos);
            } catch (error) {
                console.error("❌ Error fetching photos:", error);
                photoGrid.innerHTML = `<p class='error'>Error loading photos: ${error.message}</p>`;
            }
        });
    }

    // Display paginated photos
    function displayPhotos(photos = filteredPhotos) {
        if (page > totalPages) {
            safeDisplay(noMoreContent, "block");
            safeDisplay(loadingSpinner, "none");
            return;
        }

        if (isLoading) return;
        isLoading = true;

        safeDisplay(loadingSpinner, "block");

        setTimeout(() => {
            const startIndex = (page - 1) * photosPerPage;
            const endIndex = startIndex + photosPerPage;
            const photosToShow = photos.slice(startIndex, endIndex);

            if (photosToShow.length === 0 && page === 1) {
                photoGrid.innerHTML = "<p class='no-photos'>No photos found.</p>";
                safeDisplay(loadingSpinner, "none");
                isLoading = false;
                return;
            }

            photosToShow.forEach((photo) => {
                const photoItem = document.createElement("div");
                photoItem.classList.add("photo-item");
                photoItem.dataset.photoId = photo.id;

                photoItem.innerHTML = `
                    <img src="${photo.src}" alt="${photo.photoName}">
                    <div class="photo-info">
                        <span class="photo-name">${photo.photoName}</span>
                        <span class="album-name">${photo.album}</span>
                        <span class="timestamp">${photo.timestamp}</span>
                    </div>
                    <div class="photo-actions">
                        <button class="button-hover like-btn">Like</button>
                        <button class="button-hover comment-btn">Comment</button>
                        <button class="button-hover share-btn">Share</button>
                        <button class="button-hover delete-btn" data-id="${photo.id}">Delete</button>
                    </div>
                `;
                photoGrid.appendChild(photoItem);

                // Add delete event listener
                const deleteBtn = photoItem.querySelector(".delete-btn");
                if (deleteBtn) {
                    deleteBtn.addEventListener("click", function() {
                        const photoId = this.getAttribute("data-id");
                        deletePhoto(photoId, photoItem);
                    });
                }
            });

            safeDisplay(loadingSpinner, "none");
            isLoading = false;
            page++;
        }, 1000);
    }

    // Delete photo function
    async function deletePhoto(photoId, photoElement) {
        if (!photoId) {
            console.error("❌ Error: photoId is undefined!");
            alert("Photo ID not found. Unable to delete.");
            return;
        }

        console.log("🗑️ Attempting to delete photo with ID:", photoId);

        if (!confirm("Are you sure you want to delete this photo?")) return;

        try {
            await deleteDoc(doc(db, "photos", photoId));
            photoElement.remove();
            console.log("✅ Photo deleted successfully!", photoId);

            // Remove the photo from our arrays
            allPhotos = allPhotos.filter(p => p.id !== photoId);
            filteredPhotos = filteredPhotos.filter(p => p.id !== photoId);
        } catch (error) {
            console.error("❌ Error deleting photo:", error);
            alert("Failed to delete photo: " + error.message);
        }
    }

    // Make deletePhoto available globally
    window.deletePhoto = deletePhoto;

    // Infinite Scroll
    window.addEventListener("scroll", () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (!isLoading && scrollTop + clientHeight >= scrollHeight - 10) {
            displayPhotos(filteredPhotos);
        }
    });

    // Function to display albums and album photos in albums.html
    window.displayAlbums = async function() {
        console.log("📂 Displaying albums...");

        const albumsContainer = document.getElementById("albums-container");
        const albumTitle = document.getElementById("album-title");
        const albumPhotoGrid = document.getElementById("photo-grid");
        const searchAlbums = document.getElementById("search-albums");

        if (!albumsContainer) {
            console.error("❌ Albums container not found!");
            return;
        }

        // Clear albums container
        albumsContainer.innerHTML = "";

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error("❌ User not authenticated!");
                albumsContainer.innerHTML = "<p class='no-auth'>Please sign in to view albums.</p>";
                return;
            }

            try {
                const querySnapshot = await getDocs(collection(db, "photos"));

                // Create a Map to store unique albums with their first photo as cover
                const albumsMap = new Map();
                const albumPhotos = new Map();

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Add the document ID to the data
                    const photoData = {
                        ...data,
                        id: doc.id,
                        photoName: data.photoName || "Unnamed Photo"
                    };

                    // Only include this user's photos and skip Uncategorized
                    if (data.userId === user.uid && data.album !== "Uncategorized") {
                        if (!albumsMap.has(data.album)) {
                            // First photo for this album becomes the cover
                            albumsMap.set(data.album, {
                                name: data.album,
                                coverImage: data.imageUrl,
                                photos: []
                            });
                            albumPhotos.set(data.album, []);
                        }

                        // Add this photo to the album's collection
                        albumPhotos.get(data.album).push(photoData);
                    }
                });

                if (albumsMap.size === 0) {
                    albumsContainer.innerHTML = "<p class='no-albums'>No albums created yet.</p>";
                    return;
                }

                // Create album cards
                albumsMap.forEach((album, albumName) => {
                    const albumCard = document.createElement("div");
                    albumCard.classList.add("album-card");

                    albumCard.innerHTML = `
                        <img src="${album.coverImage}" alt="${albumName}" class="album-cover">
                        <h3>${albumName}</h3>
                        <p>${albumPhotos.get(albumName).length} photo${albumPhotos.get(albumName).length > 1 ? 's' : ''}</p>
                    `;

                    albumsContainer.appendChild(albumCard);

                    // Add click event to show photos
                    albumCard.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation(); // Prevent unintended event propagation
                        // Debug logs
                        logData("📸 Album clicked:", albumName);
                        logData("📸 Photos in album:", albumPhotos.get(albumName));
                        // Update album title
                        if (albumTitle) {
                            albumTitle.textContent = albumName;
                        }

                        // Clear photo grid
                        if (albumPhotoGrid) {
                            albumPhotoGrid.innerHTML = "";

                            // Display all photos in this album
                            const photos = albumPhotos.get(albumName);

                            if (photos && photos.length > 0) {

                                logData("📸 Displaying photos:", photos.length);
                                // Display all photos in this album
                                photos.forEach((photo) => {
                                    const photoItem = document.createElement("div");
                                    photoItem.classList.add("photo-item");
                                    photoItem.dataset.photoId = photo.id;

                                    // Ensure we have valid image URL
                                    const imageUrl = photo.imageUrl || photo.src;
                                    if (!imageUrl) {
                                        console.error("❌ Missing image URL for photo:", photo);
                                        return; // Skip this photo
                                    }

                                    // Format timestamp
                                    let timeDisplay = "Just now";
                                    if (photo.timestamp) {
                                        const date = photo.timestamp.toDate();
                                        timeDisplay = date.toLocaleString();
                                    }

                                    photoItem.innerHTML = `
                                        <img src="${photo.imageUrl}" alt="${photo.photoName}">
                                        <div class="photo-info">
                                            <span class="photo-name">${photo.photoName}</span>
                                            <span class="timestamp">${timeDisplay}</span>
                                        </div>
                                        <div class="photo-actions">
                                            <button class="button-hover like-btn">Like</button>
                                            <button class="button-hover comment-btn">Comment</button>
                                            <button class="button-hover share-btn">Share</button>
                                            <button class="button-hover delete-btn" data-id="${photo.id}">Delete</button>
                                        </div>
                                    `;

                                    albumPhotoGrid.appendChild(photoItem);

                                    // Add delete event listener
                                    const deleteBtn = photoItem.querySelector(".delete-btn");
                                    if (deleteBtn) {
                                        deleteBtn.addEventListener("click", function(e) {
                                            e.stopPropagation(); // Prevent event bubbling
                                            const photoId = this.getAttribute("data-id");
                                            window.deletePhoto(photoId, photoItem);
                                        });
                                    }
                                });
                            } else {
                                albumPhotoGrid.innerHTML = "<p class='no-photos'>No photos in this album.</p>";
                            }
                        }
                    });
                });

                console.log(`✅ ${albumsMap.size} albums loaded successfully!`);

                // Search functionality for albums
                if (searchAlbums) {
                    searchAlbums.addEventListener("input", () => {
                        const searchTerm = searchAlbums.value.toLowerCase();
                        const albumCards = document.querySelectorAll(".album-card");

                        albumCards.forEach(card => {
                            const albumName = card.querySelector("h3").textContent.toLowerCase();
                            if (albumName.includes(searchTerm)) {
                                card.style.display = "block";
                            } else {
                                card.style.display = "none";
                            }
                        });
                    });
                }

            } catch (error) {
                console.error("❌ Error displaying albums:", error);
                albumsContainer.innerHTML = `<p class='error'>Error loading albums: ${error.message}</p>`;
            }
        });
    };

    // Navbar Hamburger Menu
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");

    if (hamburger && navLinks) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navLinks.classList.toggle("active");
        });
    }

    // Initialize based on current page
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/")) {
        // Home page - load uncategorized photos
        fetchPhotosFromFirestore();
    } else if (window.location.pathname.includes("albums.html")) {
        // Albums page - load albums
        displayAlbums();
        document.addEventListener("visibilitychange", function() {
            if (!document.hidden && window.location.pathname.includes("albums.html")) {
                console.log("🔄 Page became visible again, refreshing albums");
                window.displayAlbums();
            }
        });
    }

    // Add this function to app.js
    function loadSelectedAlbum() {
        const selectedAlbum = localStorage.getItem('selectedAlbum');
        if (selectedAlbum) {
            const albumCards = document.querySelectorAll('.album-card');
            for (const card of albumCards) {
                const albumName = card.querySelector('h3').textContent;
                if (albumName === selectedAlbum) {
                    // Simulate click on the previously selected album
                    setTimeout(() => card.click(), 500);
                    break;
                }
            }
        }
    }
});