
// Import Firebase modules
import { db, auth, collection, getDocs } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    console.log("📱 App.js loaded");
    
    const photoGrid = document.getElementById("photo-grid");
    const loadingSpinner = document.getElementById("loading");
    const noMoreContent = document.getElementById("no-more-content");

    // Ensure elements exist before using them
    function safeDisplay(element, displayStyle) {
        if (element) {
            element.style.display = displayStyle;
        }
    }

    let allPhotos = [];
    let page = 1;
    const photosPerPage = 6;
    let totalPages = 1;
    let isLoading = false;

    // ✅ Fetch uncategorized photos from Firestore for index.html
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
                            src: data.imageUrl,
                            album: "Uncategorized",
                            timestamp: data.timestamp ? data.timestamp.toDate().toLocaleString() : "Just now"
                        });
                    }
                });

                totalPages = Math.ceil(allPhotos.length / photosPerPage);
                console.log(`📊 Total Uncategorized Photos: ${allPhotos.length}`);

                page = 1;
                displayPhotos();
            } catch (error) {
                console.error("❌ Error fetching photos:", error);
                photoGrid.innerHTML = `<p class='error'>Error loading photos: ${error.message}</p>`;
            }
        });
    }

    // ✅ Display paginated photos
    function displayPhotos() {
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
            const photosToShow = allPhotos.slice(startIndex, endIndex);

            photosToShow.forEach((photo) => {
                const photoItem = document.createElement("div");
                photoItem.classList.add("photo-item");
                photoItem.innerHTML = `
                    <img src="${photo.src}" alt="Uploaded Photo">
                    <div class="photo-info">
                        <span class="album-name">${photo.album}</span>
                        <span class="timestamp">${photo.timestamp}</span>
                    </div>
                    <div class="photo-actions">
                        <button class="button-hover">Like</button>
                        <button class="button-hover">Comment</button>
                        <button class="button-hover">Share</button>
                        <button class="button-hover">Delete</button>
                    </div>
                `;
                photoGrid.appendChild(photoItem);
            });

            safeDisplay(loadingSpinner, "none");
            isLoading = false;
            page++;
        }, 1000);
    }

    // ✅ Infinite Scroll
    window.addEventListener("scroll", () => {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        if (!isLoading && scrollTop + clientHeight >= scrollHeight - 10) {
            displayPhotos();
        }
    });

    // ✅ Function to display albums and album photos in albums.html
    window.displayAlbums = async function() {
        console.log("📂 Displaying albums...");
        
        const albumsContainer = document.getElementById("albums-container");
        const albumTitle = document.getElementById("album-title");
        const albumPhotoGrid = document.getElementById("photo-grid");
        
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
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log(data)
                    // Only include this user's photos and skip Uncategorized
                    if (data.userId === user.uid && data.album !== "Uncategorized") {
                        if (!albumsMap.has(data.album)) {
                            // First photo for this album becomes the cover
                            albumsMap.set(data.album, {
                                name: data.album,
                                coverImage: data.imageUrl,
                                photos: [data]
                            });
                        } else {
                            // Add this photo to the album's collection
                            const album = albumsMap.get(data.album);
                            album.photos.push(data);
                        }
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
                        <p>${album.photos.length} photo${album.photos.length > 1 ? 's' : ''}</p>
                    `;
                    
                    albumsContainer.appendChild(albumCard);
                    
                    // Add click event to show photos
                    albumCard.addEventListener("click", () => {
                        // Update album title
                        if (albumTitle) {
                            albumTitle.textContent = albumName;
                        }
                        
                        // Clear photo grid
                        if (albumPhotoGrid) {
                            albumPhotoGrid.innerHTML = "";
                            
                            // Display all photos in this album
                            album.photos.forEach((photo) => {
                                const photoItem = document.createElement("div");
                                photoItem.classList.add("photo-item");
                                
                                // Format timestamp
                                let timeDisplay = "Just now";
                                if (photo.timestamp) {
                                    const date = photo.timestamp.toDate();
                                    timeDisplay = date.toLocaleString();
                                }
                                
                                photoItem.innerHTML = `
                                    <img src="${photo.imageUrl}" alt="Photo">
                                    <div class="photo-info">
                                        <span class="timestamp">${timeDisplay}</span>
                                    </div>
                                    <div class="photo-actions">
                                        <button class="like-btn">Like</button>
                                        <button class="comment-btn">Comment</button>
                                        <button class="share-btn">Share</button>
                                        <button class="delete-btn">Delete</button>
                                    </div>
                                `;
                                
                                albumPhotoGrid.appendChild(photoItem);
                            });
                        }
                    });
                });
                
                console.log(`✅ ${albumsMap.size} albums loaded successfully!`);
                
            } catch (error) {
                console.error("❌ Error displaying albums:", error);
                albumsContainer.innerHTML = `<p class='error'>Error loading albums: ${error.message}</p>`;
            }
        });
    };

    // ✅ Navbar Hamburger Menu
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");

    if (hamburger && navLinks) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navLinks.classList.toggle("active");
        });
    }

    

    // Search functionality for albums
    const searchAlbums = document.getElementById("search-albums");
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

    // Initialize based on current page
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/" || window.location.pathname.endsWith("/")) {
        // Home page - load uncategorized photos
        fetchPhotosFromFirestore();
    } else if (window.location.pathname.includes("albums.html")) {
        // Albums page - load albums
        displayAlbums();
    }
});