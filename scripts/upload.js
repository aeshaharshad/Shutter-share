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
            <input type="text" id="photo-name" placeholder="Enter Photo Name (Required)" required>
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
        const photoName = document.getElementById("photo-name").value.trim();
        const albumName = document.getElementById("album-name").value.trim();
        
        if (!photoName) {
            alert("Please enter a name for the photo");
            return;
        }
        
        saveImageData(albumName, file, photoName);
        modal.remove();
    });
}

function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => (document.getElementById("preview-image").src = e.target.result);
    reader.readAsDataURL(file);
}

async function saveImageData(albumName, file, photoName) {
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
                    photoName: photoName,
                    album: finalAlbum,
                    timestamp: serverTimestamp(),
                    userId: user.uid,
                    email: user.email,
                });
                console.log(`✅ Image "${photoName}" saved to album "${finalAlbum}" with ID: ${docRef.id}`);
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
        if (typeof fetchPhotosFromFirestore === "function") {
            fetchPhotosFromFirestore();
        } else {
            location.reload();
        }
    } else if (currentPath.includes("albums.html")) {
        if (typeof displayAlbums === "function") {
            displayAlbums();
        } else {
            location.reload();
        }
    }
}

window.deletePhoto = async function(photoId, photoElement) {
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
};