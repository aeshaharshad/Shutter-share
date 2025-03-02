
  

import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signInWithPopup, GoogleAuthProvider, sendSignInLinkToEmail, 
  isSignInWithEmailLink, signInWithEmailLink, signOut } 
from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

const provider = new GoogleAuthProvider();

// 🔹 Logout Function
document.getElementById("logout-btn")?.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        window.location.href = "login.html"; 
      })
      .catch((error) => alert("❌ Error: " + error.message));
  });
  

//  Email/Password Signup
document.getElementById("signup-form")?.addEventListener("submit", (e) => {
e.preventDefault();
const name = e.target[0].value;
const email = e.target[1].value;
const password = e.target[2].value;


createUserWithEmailAndPassword(auth, email, password)
 .then((userCredential) => {
     console.log("User created:", userCredential.user);  // Debugging
     alert("✅ Signup successful! Please log in.");
     window.location.href = "login.html";
 })
 .catch(error => {
     console.error("Signup Error:", error.code, error.message);  // Debugging
     alert("❌ Error: " + error.message);
 });

});
//  Email/Password Login
document.getElementById("login-form")?.addEventListener("submit", (e) => {
e.preventDefault();
const email = e.target[0].value;
const password = e.target[1].value;

signInWithEmailAndPassword(auth, email, password)
 .then(() => {
     alert("✅ Login successful!");
     window.location.href = "index.html";
 })
 .catch(error => alert("❌ Error: " + error.message));
});

// 🔹 Google Sign-In
document.getElementById("google-signin")?.addEventListener("click", () => {
signInWithPopup(auth, provider)
 .then(() => {
     alert("✅ Google Sign-in successful!");
     window.location.href = "index.html";
 })
 .catch(error => alert("❌ Error: " + error.message));
});

// 🔹 Email Link (Passwordless Login)
document.getElementById("email-link-signin")?.addEventListener("click", () => {
const email = prompt("Enter your email to receive a login link:");
if (!email) return;

const actionCodeSettings = {
 url: window.location.href,
 handleCodeInApp: true,
};

sendSignInLinkToEmail(auth, email, actionCodeSettings)
 .then(() => {
     alert("✅ Login link sent! Check your email.");
     localStorage.setItem("emailForSignIn", email);
 })
 .catch(error => alert("❌ Error: " + error.message));
});

//  Handling Email Link Login
if (isSignInWithEmailLink(auth, window.location.href)) {
let email = localStorage.getItem("emailForSignIn");
if (!email) {
 email = prompt("Enter your email for confirmation:");
}

signInWithEmailLink(auth, email, window.location.href)
 .then(() => {
     alert("✅ Successfully signed in!");
     window.location.href = "index.html";
 })
 .catch(error => alert("❌ Error: " + error.message));
}




