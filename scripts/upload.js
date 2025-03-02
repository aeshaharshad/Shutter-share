import { db, auth, collection, addDoc, getDocs, doc, deleteDoc, getDoc, setDoc, serverTimestamp } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function () {
    console.log("📢 Page Loaded: Upload.js initialized");

    const uploadBtn = document.getElementById("upload-btn");
    if (uploadBtn) {
        console.log("✅ Upload button found");
        
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        uploadBtn.addEventListener("click", function () {
            console.log("📸 Upload button clicked!");
            fileInput.click();
        });

        fileInput.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (file) {
                console.log("📂 File selected:", file.name);
                showUploadForm(file);
            }
        });
    } else {
        console.log("❌ Upload button not found");
    }

    function showUploadForm(file) {
        console.log("🖼️ Displaying preview modal...");

        const modal = document.createElement("div");
        modal.classList.add("upload-modal");

        modal.innerHTML = `
            <div class="modal-content">
                <h3>Upload Photo</h3>
                <img id="preview-image" class="preview-image">
                <input type="text" id="album-name" placeholder="Enter Album Name (Optional)">
                <div class="modal-buttons">
                    <button id="confirm-upload">Upload</button>
                    <button id="cancel-upload">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = function (e) {
            document.getElementById("preview-image").src = e.target.result;
        };

        document.getElementById("cancel-upload").addEventListener("click", function () {
            document.body.removeChild(modal);
        });

        document.getElementById("confirm-upload").addEventListener("click", function () {
            const albumName = document.getElementById("album-name").value.trim();
            saveImageData(albumName, file);
            document.body.removeChild(modal);
        });
    }

    async function saveImageData(albumName, file) {
        console.log("📤 Uploading image to Firestore...");

        // Ensure user is logged in before uploading
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                console.error("❌ User not authenticated!");
                alert("You must be logged in to upload photos.");
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onload = async function (e) {
                try {
                    const imageUrl = e.target.result;

                    // Determine the album name
                    const finalAlbum = albumName || "Uncategorized";

                    // Save to Firestore
                    const docRef = await addDoc(collection(db, "photos"), {
                        imageUrl: imageUrl,
                        album: finalAlbum,
                        timestamp: serverTimestamp(),
                        userId: user.uid,
                        email: user.email
                    });

                    console.log(`✅ Image saved to album "${finalAlbum}" with ID: ${docRef.id}`);
                    
                    // Refresh the image display based on current page
                    const currentPath = window.location.pathname;
                    
                    if (currentPath.includes("index.html") || currentPath === "/" || currentPath.endsWith("/")) {
                        // Only refresh if we're on the home page and the album is Uncategorized
                        if (finalAlbum === "Uncategorized") {
                            console.log("🔄 Refreshing home page photos...");
                            fetchPhotosFromFirestore();
                        }
                    } else if (currentPath.includes("albums.html")) {
                        // On albums page, refresh the albums display
                        console.log("🔄 Refreshing albums...");
                        if (typeof displayAlbums === 'function') {
                            displayAlbums();
                        } else {
                            // If the function doesn't exist, reload the page
                            location.reload();
                        }
                    }
                    
                } catch (error) {
                    console.error("❌ Error saving image to Firestore:", error);
                    alert("Failed to upload image: " + error.message);
                }
            };
        });
    }

    // Define the fetchPhotosFromFirestore function to be used globally
    window.fetchPhotosFromFirestore = async function() {
        console.log("🔄 Loading images from Firestore...");
        const photoGrid = document.getElementById("photo-grid");
        if (!photoGrid) {
            console.error("❌ Photo grid not found!");
            return;
        }

        // Clear existing content
        photoGrid.innerHTML = "";

        // Ensure user is logged in before loading images
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
                photoGrid.innerHTML = "<p class='no-photos'>No photos uploaded yet.</p>";
                return;
            }

            let imagesFound = false;
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log("this data"+data);

                // Only show images for the current user AND only uncategorized images on home page
                if (data.userId === user.uid && data.album === "Uncategorized") {
                    imagesFound = true;

                    const photoItem = document.createElement("div");
                    photoItem.classList.add("photo-item");
                    photoItem.setAttribute("data-photo-id", doc.id);
                    photoItem.style.position = 'relative'; // Add position relative

                    // Format the timestamp if it exists
                    let timeDisplay = "Just now";
                    if (data.timestamp) {
                        const date = data.timestamp.toDate();
                        timeDisplay = date.toLocaleString();
                    }

                    photoItem.innerHTML = `
                        <img src="${data.imageUrl}" alt="Uploaded Photo">
                        <div class="photo-info">
                            <span class="album-name">${data.album}</span>
                            <span class="timestamp">${timeDisplay}</span>
                        </div>
                        <div class="photo-actions">
                            <button class="like-btn">Like</button>
                            <button class="comment-btn">Comment</button>
                            <button class="share-btn">Share</button>
                            <button class="delete-btn" data-id="${doc.id}" style="background-color: #dc3545; color: white; padding: 8px 15px; border-radius: 5px; border: none; cursor: pointer; display: inline-block; margin-top: 5px;">Delete</button>
                        </div>
                    `;

                    photoGrid.appendChild(photoItem);
                    
                    // Add delete event listener
                    const deleteBtn = photoItem.querySelector(".delete-btn");
                    console.log("Delete button found:", deleteBtn);
                    if (deleteBtn) {
                        deleteBtn.addEventListener("click", function(e) {
                            e.stopPropagation();
                            const photoId = this.getAttribute("data-id");
                            deletePhoto(photoId, photoItem);
                        });
                    }
                }
            });

            if (!imagesFound) {
                photoGrid.innerHTML = "<p class='no-photos'>No uncategorized photos found.</p>";
            }

            console.log("✅ Images loaded successfully!");
            
            // Run our custom function to add floating delete buttons
            setTimeout(addFloatingDeleteButtons, 500);
            
        } catch (error) {
            console.error("❌ Error loading images:", error);
            photoGrid.innerHTML = "<p class='error'>Error loading photos: " + error.message + "</p>";
        }
    };

    // Function to load album photos
    window.loadAlbumPhotos = async function(albumName) {
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
                    photoItem.style.position = 'relative'; // Add position relative

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
                            <button class="delete-btn" data-id="${doc.id}" style="background-color: #dc3545; color: white; padding: 8px 15px; border-radius: 5px; border: none; cursor: pointer; display: inline-block; margin-top: 5px;">Delete</button>
                        </div>
                    `;

                    photoGrid.appendChild(photoItem);
                    
                    // Add delete event listener
                    const deleteBtn = photoItem.querySelector(".delete-btn");
                    if (deleteBtn) {
                        deleteBtn.addEventListener("click", function(e) {
                            e.stopPropagation();
                            const photoId = this.getAttribute("data-id");
                            deletePhoto(photoId, photoItem);
                        });
                    }
                }
            });

            if (!imagesFound) {
                photoGrid.innerHTML = "<p class='no-photos'>No photos found in this album.</p>";
            }

            console.log("✅ Album photos loaded successfully!");
            
            // Run our custom function to add floating delete buttons
            setTimeout(addFloatingDeleteButtons, 500);
            
        } catch (error) {
            console.error("❌ Error loading album photos:", error);
            photoGrid.innerHTML = "<p class='error'>Error loading photos: " + error.message + "</p>";
        }
    };

    // Function to display albums
    window.displayAlbums = async function() {
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
    };

    // Function to delete a photo
    async function deletePhoto(photoId, photoElement) {
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
            
            // Check if we're on the albums page and need to refresh album display
            if (window.location.pathname.includes("albums.html")) {
                // Refresh albums if we're on the albums page
                displayAlbums();
            }
            
        } catch (error) {
            console.error("❌ Error deleting photo:", error);
            alert("Failed to delete photo: " + error.message);
        }
    }

    // // NEW CODE: Function to add floating delete buttons to all photos
    // function addFloatingDeleteButtons() {
    //     console.log("Checking for photos without delete buttons...");
        
    //     // Get all photo items
    //     const photoItems = document.querySelectorAll('.photo-item');
    //     console.log(`Found ${photoItems.length} photo items`);
        
    //     if (photoItems.length === 0) {
    //         return; // No photos to process
    //     }
        
    //     // Process each photo item
    //     photoItems.forEach((photoItem) => {
    //         const photoId = photoItem.getAttribute('data-photo-id');
            
    //         // Check if this photo already has our custom delete button
    //         if (!photoItem.querySelector('.custom-delete-btn')) {
    //             console.log(`Adding custom delete button to photo ${photoId}`);
                
    //             // Make sure photo item has position relative
    //             photoItem.style.position = 'relative';
                
    //             // Create a new delete button
    //             const deleteBtn = document.createElement('button');
    //             deleteBtn.className = 'custom-delete-btn';
    //             deleteBtn.setAttribute('data-id', photoId);
    //             deleteBtn.textContent = '×';
                
    //             // Apply styles directly to the button
    //             deleteBtn.style.position = 'absolute';
    //             deleteBtn.style.top = '10px';
    //             deleteBtn.style.right = '10px';
    //             deleteBtn.style.backgroundColor = '#dc3545';
    //             deleteBtn.style.color = 'white';
    //             deleteBtn.style.border = 'none';
    //             deleteBtn.style.borderRadius = '50%';
    //             deleteBtn.style.width = '30px';
    //             deleteBtn.style.height = '30px';
    //             deleteBtn.style.fontSize = '20px';
    //             deleteBtn.style.fontWeight = 'bold';
    //             deleteBtn.style.cursor = 'pointer';
    //             deleteBtn.style.zIndex = '999';
    //             deleteBtn.style.display = 'flex';
    //             deleteBtn.style.alignItems = 'center';
    //             deleteBtn.style.justifyContent = 'center';
                
    //             // Add event listener
    //             deleteBtn.addEventListener('click', function(e) {
    //                 e.stopPropagation();
    //                 const photoId = this.getAttribute("data-id");
    //                  console.log("Deleting photo with ID:", photoId);
    //                 console.log(`Custom delete button clicked for photo ${photoId}`);
                    
    //                 if (confirm('Are you sure you want to delete this photo?')) {
    //                     console.log(`Confirmed delete for photo ${photoId}`);
    //                     // Call the delete function
    //                     deletePhotoById(photoId, photoItem);
    //                 }
    //             });
                
    //             // Add button to photo item
    //             photoItem.appendChild(deleteBtn);
    //         }
    //     });
    // }

    // // NEW CODE: Define a standalone delete function that doesn't rely on existing code
    // async function deletePhotoById(photoId, photoElement) {
    //     console.log(`Deleting photo with ID: ${photoId}`);
        
    //     try {
    //         // Delete from Firestore
    //         await deleteDoc(doc(db, "photos", photoId));
            
    //         // Remove element from DOM
    //         if (photoElement) {
    //             photoElement.remove();
    //         }
            
    //         console.log("Photo deleted successfully!");
            
    //         // Check if we're on the albums page and need to refresh album display
    //         if (window.location.pathname.includes("albums.html") && typeof displayAlbums === 'function') {
    //             displayAlbums();
    //         }
            
    //     } catch (error) {
    //         console.error("Error deleting photo:", error);
    //         alert("Failed to delete photo: " + error.message);
    //     }
    // }

    // NEW CODE: Run the function on page load and then periodically
    // Run once after a delay to ensure photos are loaded
    // setTimeout(addFloatingDeleteButtons, 1000);
    
    // // Then run every 3 seconds to catch any new photos
    // setInterval(addFloatingDeleteButtons, 3000);

    // // NEW CODE: Also run when photos might have been added
    // document.addEventListener('click', function(e) {
    //     // Run after any click that might load new photos
    //     setTimeout(addFloatingDeleteButtons, 500);
    // });

    // // Initialize page-specific functionality
    // const currentPath = window.location.pathname;
});