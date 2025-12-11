import bcrypt from "bcryptjs";
import { firestore } from "../src/config/firebase";
import { usersCol, instructorsCol } from "../src/models/collections";

async function createInstructor() {
  const email = "instructor@gmail.com";
  const name = "Test Instructor";
  const password = "instructor@1234";

  try {
    // 1. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 2. Create user doc
    const userRef = usersCol.doc(); // Auto ID
    await userRef.set({
      email,
      name,
      role: "instructor",
      firebaseUid: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. Create instructor doc
    await instructorsCol.doc(userRef.id).set({
      userId: userRef.id,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Instructor created successfully!");
    console.log("ID:", userRef.id);
  } catch (err) {
    console.error("❌ Error creating instructor:", err);
  }
}

createInstructor();

