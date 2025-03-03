import { db, auth, collection, getDocs, doc, getDoc, updateDoc, setDoc, query, where, serverTimestamp } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    console.log("📢 Page Loaded: Account.js initialized");
    
    // References to DOM elements
    // const profilePicture = document.getElementById("profile-picture");
    // const profilePictureEdit = document.getElementById("profile-picture-edit");
    // const profilePictureInput = document.getElementById("profile-picture-input");
    const userNameElement = document.getElementById("user-name");
    const userEmailElement = document.getElementById("user-email");
    const userEmailDetailElement = document.getElementById("user-email-detail");
    const displayNameElement = document.getElementById("display-name");
    const editNameBtn = document.getElementById("edit-name-btn");
    const editNameContainer = document.getElementById("edit-name-container");
    const editNameInput = document.getElementById("edit-name-input");
    const saveNameBtn = document.getElementById("save-name-btn");
    const cancelNameBtn = document.getElementById("cancel-name-btn");
    const changePasswordBtn = document.getElementById("change-password-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const joinDateElement = document.getElementById("join-date");
    const accountTypeElement = document.getElementById("account-type");
    const photosCountElement = document.getElementById("photos-count");
    const albumsCountElement = document.getElementById("albums-count");
    const sharedCountElement = document.getElementById("shared-count");
    const privacySettingSelect = document.getElementById("privacy-setting");

  
    let currentUser = null;
    let userProfileData = {};

    // ✅ Auth state monitoring
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("👤 User logged in:", user.email);
            currentUser = user;
            
            // Load user information
            await loadUserProfile(user);
            
            // Load user statistics
            loadUserStatistics(user);
        } else {
            console.log("❌ No user logged in. Redirecting to login...");
            window.location.href = "login.html"; // Redirect if not logged in
        }
    });

    // ✅ Load user profile data
    async function loadUserProfile(user) {
        try {
            // Basic user auth info
            userNameElement.innerText = user.displayName || "User";
            userEmailElement.innerText = user.email;
            userEmailDetailElement.innerText = user.email;
            displayNameElement.innerText = user.displayName || "User";
            
          
            
            // Try to get additional user data from Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                userProfileData = userDoc.data();
                
                // Set join date
                if (userProfileData.createdAt) {
                    const joinDate = userProfileData.createdAt.toDate();
                    joinDateElement.innerText = joinDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                } else {
                    joinDateElement.innerText = "Unknown";
                }
                
                // Account type
                accountTypeElement.innerText = userProfileData.accountType || "Standard";
                
                // Privacy settings
                if (userProfileData.privacySetting) {
                    privacySettingSelect.value = userProfileData.privacySetting;
                }
            } else {
                // Create user document if it doesn't exist
                await createUserProfile(user);
                joinDateElement.innerText = new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            }
        } catch (error) {
            console.error("❌ Error loading user profile:", error);
        }
    }
    
    // ✅ Create new user profile in Firestore
    async function createUserProfile(user) {
        try {
            console.log("Creating new user profile for:", user.uid);
            const userDocRef = doc(db, "users", user.uid);
            
            // Create new user document with setDoc
            await setDoc(userDocRef, {
                displayName: user.displayName || "User",
                email: user.email,
                createdAt: serverTimestamp(),
                accountType: "Standard",
                privacySetting: "public"
            });
            
            console.log("✅ User profile created in Firestore");
        } catch (error) {
            console.error("❌ Error creating user profile:", error);
            // Log more details for debugging
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
        }
    }
    
    // ✅ Load user statistics
    async function loadUserStatistics(user) {
        try {
            // Count photos
            const photosQuery = query(collection(db, "photos"), where("userId", "==", user.uid));
            const photosSnapshot = await getDocs(photosQuery);
            photosCountElement.innerText = photosSnapshot.size;
            
            // Count albums
            const albumSet = new Set();
            photosSnapshot.forEach(doc => {
                const photoData = doc.data();
                if (photoData.album) {
                    albumSet.add(photoData.album);
                }
            });
            albumsCountElement.innerText = albumSet.size;
            
            // Count shared albums (if you have a sharing feature)
            // This is a placeholder - implement according to your sharing model
            sharedCountElement.innerText = "0";
            
        } catch (error) {
            console.error("❌ Error loading user statistics:", error);
        }
    }
    

    
    // ✅ Display name edit functionality
    if (editNameBtn) {
        editNameBtn.addEventListener("click", () => {
            editNameInput.value = displayNameElement.innerText;
            displayNameElement.classList.add("hidden");
            editNameBtn.classList.add("hidden");
            editNameContainer.classList.remove("hidden");
        });
    }
    
    if (saveNameBtn) {
        saveNameBtn.addEventListener("click", async () => {
            const newName = editNameInput.value.trim();
            if (!newName) return;
            
            try {
                // Update Firebase Auth profile
                await updateProfile(currentUser, {
                    displayName: newName
                });
                
                try {
                    // Update Firestore user document
                    const userDocRef = doc(db, "users", currentUser.uid);
                    await updateDoc(userDocRef, {
                        displayName: newName,
                        updatedAt: serverTimestamp()
                    });
                } catch (firestoreError) {
                    // If document doesn't exist, create it
                    if (firestoreError.code === 'not-found') {
                        await createUserProfile(currentUser);
                    }
                }
                
                // Update UI
                displayNameElement.innerText = newName;
                userNameElement.innerText = newName;
                
                // Hide edit controls
                displayNameElement.classList.remove("hidden");
                editNameBtn.classList.remove("hidden");
                editNameContainer.classList.add("hidden");
                
                // Apply highlight animation
                displayNameElement.classList.add("highlight");
                setTimeout(() => {
                    displayNameElement.classList.remove("highlight");
                }, 2000);
                
                console.log("✅ Display name updated successfully");
            } catch (error) {
                console.error("❌ Error updating display name:", error);
                alert("Failed to update display name: " + error.message);
            }
        });
    }
    
    if (cancelNameBtn) {
        cancelNameBtn.addEventListener("click", () => {
            displayNameElement.classList.remove("hidden");
            editNameBtn.classList.remove("hidden");
            editNameContainer.classList.add("hidden");
        });
    }
    
    // ✅ Change password functionality
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener("click", async () => {
            // Only applicable for email/password auth
            const providerData = currentUser.providerData;
            const emailProvider = providerData.find(p => p.providerId === 'password');
            
            if (!emailProvider) {
                alert("Password change is only available for email/password accounts.");
                return;
            }
            
            try {
                // Ask for current password to reauthenticate
                const currentPassword = prompt("Please enter your current password to continue:");
                if (!currentPassword) return;
                
                // Reauthenticate
                const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
                await reauthenticateWithCredential(currentUser, credential);
                
                // Get new password
                const newPassword = prompt("Please enter your new password:");
                if (!newPassword) return;
                
                // Validate password (add your own validation rules)
                if (newPassword.length < 6) {
                    alert("Password must be at least 6 characters long.");
                    return;
                }
                
                // Update password
                await updatePassword(currentUser, newPassword);
                alert("Password updated successfully!");
                
            } catch (error) {
                console.error("❌ Error changing password:", error);
                alert("Failed to change password: " + error.message);
            }
        });
    }
    
    // ✅ Privacy setting change
    if (privacySettingSelect) {
        privacySettingSelect.addEventListener("change", async () => {
            try {
                const newSetting = privacySettingSelect.value;
                
                // Update Firestore user document
                const userDocRef = doc(db, "users", currentUser.uid);
                await updateDoc(userDocRef, {
                    privacySetting: newSetting,
                    updatedAt: serverTimestamp()
                });
                
                console.log("✅ Privacy setting updated to:", newSetting);
            } catch (error) {
                console.error("❌ Error updating privacy setting:", error);
                
                // If document doesn't exist, create it
                if (error.code === 'not-found') {
                    try {
                        await createUserProfile(currentUser);
                        // Try again after creating profile
                        const userDocRef = doc(db, "users", currentUser.uid);
                        await updateDoc(userDocRef, {
                            privacySetting: privacySettingSelect.value,
                            updatedAt: serverTimestamp()
                        });
                        console.log("✅ Privacy setting updated after creating profile");
                    } catch (retryError) {
                        console.error("❌ Error in retry:", retryError);
                        alert("Failed to update privacy setting: " + retryError.message);
                    }
                } else {
                    alert("Failed to update privacy setting: " + error.message);
                }
            }
        });
    }
    
    // ✅ Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await auth.signOut();
                window.location.href = "login.html";
            } catch (error) {
                console.error("❌ Error during logout:", error);
                alert("Failed to log out: " + error.message);
            }
        });
    }
});