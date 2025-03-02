import { db, auth, collection, getDocs, deleteDoc, doc } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    console.log("📢 Albums.js initialized");

    // Check if user is authenticated
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("👤 User is authenticated:", user.email);
            
            // Initial load of albums
            displayAlbums();
        }
    //         // Update profile pic if available in localStorage
    //         const savedProfilePic = localStorage.getItem("profilePic");
    //         const navProfilePic = document.getElementById("nav-profile-pic");
    //         if (savedProfilePic && navProfilePic) {
    //             navProfilePic.src = savedProfilePic;
    //         }
    //     } else {
    //         console.log("⚠️ User is not authenticated");
    //         window.location.href = "login.html";
    //     }
    });

    // Handle search functionality
    const searchInput = document.getElementById("search-albums");
    if (searchInput) {
        searchInput.addEventListener("keyup", function() {
            const searchTerm = this.value.toLowerCase();
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

    // Function to display albums
    async function displayAlbums() {
        console.log("🔄 Loading albums...");
        const albumsContainer = document.getElementById("albums-container");
        
        if (!albumsContainer) {
            console.error("❌ Albums container not found!");
            return;
        }

        // Clear existing content
        albumsContainer.innerHTML = "";

        // Ensure user is logged in
        const user = auth.currentUser;
        if (!user) {
            console.log("⚠️ User not authenticated, cannot load albums");
            albumsContainer.innerHTML = "<p class='no-auth'>Please sign in to view your albums.</p>";
            return;
        }

        try {
            // Get all photos
            const querySnapshot = await getDocs(collection(db, "photos"));
            
            // Track albums and their photos
            const albums = new Map();
            
            // Group photos by album
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                // Only include current user's photos
                if (data.userId === user.uid && data.album !== "Uncategorized") {
                    if (!albums.has(data.album)) {
                        albums.set(data.album, []);
                    }
                    
                    albums.get(data.album).push({
                        id: doc.id,
                        ...data
                    });
                }
            });
            
            // Display albums
            if (albums.size === 0) {
                albumsContainer.innerHTML = "<p class='no-albums'>No albums created yet.</p>";
                return;
            }
            
            albums.forEach((photos, albumName) => {
                // Create album card
                const albumCard = document.createElement("div");
                albumCard.classList.add("album-card");
                
                // Use the first photo as the album cover
                const coverImage = photos.length > 0 ? photos[0].imageUrl : "assets/default-album.png";
                
                albumCard.innerHTML = `
                    <img src="${coverImage}" alt="${albumName}">
                    <h3>${albumName}</h3>
                    <p>${photos.length} photo${photos.length !== 1 ? 's' : ''}</p>
                `;
                
                // Add click event to view album photos
                albumCard.addEventListener("click", function() {
                    loadAlbumPhotos(albumName);
                });
                
                albumsContainer.appendChild(albumCard);
            });
            
            console.log("✅ Albums loaded successfully!");
        } catch (error) {
            console.error("❌ Error loading albums:", error);
            albumsContainer.innerHTML = "<p class='error'>Error loading albums: " + error.message + "</p>";
        }
    }

    // Function to load album photos
    async function loadAlbumPhotos(albumName) {
        console.log(`🔄 Loading photos for album: ${albumName}`);
        const photoGrid = document.getElementById("photo-grid");
        const albumTitle = document.getElementById("album-title");
        
        if (!photoGrid || !albumTitle) {
            console.error("❌ Elements not found!");
            return;
        }

        // Update the album title
        albumTitle.textContent = albumName;
        
        // Clear existing content
        photoGrid.innerHTML = "";

        // Ensure user is logged in
        const user = auth.currentUser;
        if (!user) {
            console.log("⚠️ User not authenticated, cannot load images");
            photoGrid.innerHTML = "<p class='no-auth'>Please sign in to view your photos.</p>";
            return;
        }

        try {
            const querySnapshot = await getDocs(collection(db, "photos"));
            if (querySnapshot.empty) {
                console.log("ℹ️ No images found in Firestore.");
                photoGrid.innerHTML = "<p class='no-photos'>No photos in this album.</p>";
                return;
            }

            let imagesFound = false;
            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Only show images for the current user AND for the selected album
                if (data.userId === user.uid && data.album === albumName) {
                    imagesFound = true;

                    const photoItem = document.createElement("div");
                    photoItem.classList.add("photo-item");
                    photoItem.setAttribute("data-photo-id", doc.id);

                    // Format the timestamp if it exists
                    let timeDisplay = "Just now";
                    if (data.timestamp) {
                        const date = data.timestamp.toDate();
                        timeDisplay = date.toLocaleString();
                    }

                    photoItem.innerHTML = `
                        <img src="${data.imageUrl}" alt="Uploaded Photo">
                        <div class="photo-info">
                            <span class="timestamp">${timeDisplay}</span>
                        </div>
                        <div class="photo-actions">
                            <button class="like-btn">Like</button>
                            <button class="comment-btn">Comment</button>
                            <button class="share-btn">Share</button>
                            <button class="delete-btn" data-id="${doc.id}">Delete</button>
                        </div>
                    `;

                    photoGrid.appendChild(photoItem);
                    
                    // Add delete event listener
                    const deleteBtn = photoItem.querySelector(".delete-btn");
                    deleteBtn.addEventListener("click", function(e) {
                        e.stopPropagation();
                        const photoId = this.getAttribute("data-id");
                        deletePhoto(photoId, photoItem, albumName);
                    });
                }
            });

            if (!imagesFound) {
                photoGrid.innerHTML = "<p class='no-photos'>No photos found in this album.</p>";
            }

            console.log("✅ Album photos loaded successfully!");
        } catch (error) {
            console.error("❌ Error loading album photos:", error);
            photoGrid.innerHTML = "<p class='error'>Error loading photos: " + error.message + "</p>";
        }
    }

    // Function to delete a photo
    async function deletePhoto(photoId, photoElement, albumName) {
        if (!confirm("Are you sure you want to delete this photo?")) {
            return;
        }
        
        try {
            console.log(`🗑️ Deleting photo with ID: ${photoId}`);
            
            // Delete from Firestore
            await deleteDoc(doc(db, "photos", photoId));
            
            // Remove element from DOM
            photoElement.remove();
            
            console.log("✅ Photo deleted successfully!");
            
            // Check if we need to refresh the albums view (in case this was the last photo in an album)
            const remainingPhotos = document.querySelectorAll("#photo-grid .photo-item");
            if (remainingPhotos.length === 0) {
                console.log("ℹ️ No photos left in this album, refreshing albums...");
                displayAlbums();
                // Reset album title
                const albumTitle = document.getElementById("album-title");
                if (albumTitle) {
                    albumTitle.textContent = "Select an album to view photos";
                }
            }
            
        } catch (error) {
            console.error("❌ Error deleting photo:", error);
            alert("Failed to delete photo: " + error.message);
        }
    }

    // Expose functions to global scope
    window.displayAlbums = displayAlbums;
    window.loadAlbumPhotos = loadAlbumPhotos;
});