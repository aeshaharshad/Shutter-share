import { db, auth, collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", initUpload);

function initUpload() {
    console.log("📢 Upload.js initialized");
    setupUploadButton();
}

function setupUploadButton() {
    const uploadBtn = document.getElementById("upload-btn");
    if (!uploadBtn) return console.log("❌ Upload button not found");

    console.log("✅ Upload button found");
    const fileInput = createHiddenFileInput();
    uploadBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (event) => handleFileSelection(event, fileInput));
}

function createHiddenFileInput() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
    return fileInput;
}

function handleFileSelection(event, fileInput) {
    const file = event.target.files[0];
    if (!file) return;
    console.log("📂 File selected:", file.name);
    showUploadForm(file);
    fileInput.value = "";
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
    displayImagePreview(file);

    document.getElementById("cancel-upload").addEventListener("click", () => modal.remove());
    document.getElementById("confirm-upload").addEventListener("click", () => {
        const albumName = document.getElementById("album-name").value.trim();
        saveImageData(albumName, file);
        modal.remove();
    });
}

function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => (document.getElementById("preview-image").src = e.target.result);
    reader.readAsDataURL(file);
}

async function saveImageData(albumName, file) {
    console.log("📤 Uploading image to Firestore...");

    onAuthStateChanged(auth, async (user) => {
        if (!user) return alert("You must be logged in to upload photos.");
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imageUrl = e.target.result;
                const finalAlbum = albumName || "Uncategorized";
                const docRef = await addDoc(collection(db, "photos"), {
                    imageUrl,
                    album: finalAlbum,
                    timestamp: serverTimestamp(),
                    userId: user.uid,
                    email: user.email,
                });
                console.log(`✅ Image saved to album "${finalAlbum}" with ID: ${docRef.id}`);
                refreshUI(finalAlbum);
            } catch (error) {
                console.error("❌ Error saving image to Firestore:", error);
                alert("Failed to upload image: " + error.message);
            }
        };
        reader.readAsDataURL(file);
    });
}

function refreshUI(albumName) {
    const currentPath = window.location.pathname;
    if (currentPath.includes("index.html") || currentPath === "/" || currentPath.endsWith("/")) {
        if (albumName === "Uncategorized") fetchPhotosFromFirestore();
    } else if (currentPath.includes("albums.html")) {
        typeof displayAlbums === "function" ? displayAlbums() : location.reload();
    }
}

window.fetchPhotosFromFirestore = async function () {
    console.log("🔄 Loading images from Firestore...");
    const photoGrid = document.getElementById("photo-grid");
    if (!photoGrid) return console.error("❌ Photo grid not found!");
    
    photoGrid.innerHTML = "";
    const user = auth.currentUser;
    if (!user) return (photoGrid.innerHTML = "<p class='no-auth'>Please sign in to view your photos.</p>");
    
    try {
        const querySnapshot = await getDocs(collection(db, "photos"));
        if (querySnapshot.empty) return (photoGrid.innerHTML = "<p class='no-photos'>No photos uploaded yet.</p>");

        let imagesFound = false;
        querySnapshot.forEach((doc) => {
            const photoData = doc.data();
            const photoId = doc.id; // Firestore document ID
            document.getElementById("photos-container").appendChild(createPhotoElement(photoId, photoData));
    
            if (data.userId === user.uid && data.album === "Uncategorized") {
                imagesFound = true;
                photoGrid.appendChild(createPhotoElement(doc.id, data));
            }
        });
        
        if (!imagesFound) photoGrid.innerHTML = "<p class='no-photos'>No uncategorized photos found.</p>";
    } catch (error) {
        console.error("❌ Error loading images:", error);
        photoGrid.innerHTML = `<p class='error'>Error loading photos: ${error.message}</p>`;
    }
};

function createPhotoElement(photoId, data) {
    const photoItem = document.createElement("div");
    photoItem.classList.add("photo-item");
    photoItem.setAttribute("data-photo-id", photoId);
    photoItem.innerHTML = `
        <img src="${data.imageUrl}" alt="Uploaded Photo">
        <div class="photo-info">
            <span class="album-name">${data.album}</span>
            <span class="timestamp">${data.timestamp?.toDate().toLocaleString() || "Just now"}</span>
        </div>
        <button class="delete-btn" data-id="${photoId}">Delete</button>
    `;
   photoItem.querySelector(".delete-btn").addEventListener("click", () => {
        console.log("🗑️ Deleting photo with ID:", photoId);
        deletePhoto(photoId, photoItem);
    });
    return photoItem;
}


async function deletePhoto(photoId, photoElement) {
    if (!photoId) {
        console.error("❌ Error: photoId is undefined!");
        alert("Photo ID not found. Unable to delete.");
        return;
    }

    if (!confirm("Are you sure you want to delete this photo?")) return;

    try {
        await deleteDoc(doc(db, "photos", photoId));
        photoElement.remove();
        console.log("✅ Photo deleted successfully!", photoId);
    } catch (error) {
        console.error("❌ Error deleting photo:", error);
        alert("Failed to delete photo: " + error.message);
    }
}
