import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { Category } from "@/types";
import { ALL_DEFAULT_CATEGORIES } from "@/constants/categories";

export async function getCategories(uid: string): Promise<Category[]> {
  if (!uid) return [];
  const categoriesRef = collection(firestore, `users/${uid}/categories`);
  const q = query(categoriesRef, orderBy("name", "asc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Category, "id">),
  }));
}

export async function seedDefaultCategoriesIfEmpty(uid: string): Promise<Category[]> {
  if (!uid) return [];
  const existing = await getCategories(uid);
  if (existing.length > 0) {
    return existing;
  }

  const now = new Date().toISOString();
  const created: Category[] = [];

  for (const item of ALL_DEFAULT_CATEGORIES) {
    const colRef = collection(firestore, `users/${uid}/categories`);
    const newDoc = await addDoc(colRef, {
      name: item.name,
      type: item.type,
      icon: item.icon,
      color: item.color,
      isDefault: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });

    created.push({
      id: newDoc.id,
      name: item.name,
      type: item.type,
      icon: item.icon,
      color: item.color,
      isDefault: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return created;
}

export async function addCategory(
  uid: string,
  category: { name: string; type: "income" | "expense"; icon: string; color: string }
): Promise<Category> {
  const now = new Date().toISOString();
  const colRef = collection(firestore, `users/${uid}/categories`);
  const docRef = await addDoc(colRef, {
    ...category,
    isDefault: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    ...category,
    isDefault: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateCategory(
  uid: string,
  id: string,
  updates: Partial<Omit<Category, "id" | "createdAt">>
): Promise<void> {
  const docRef = doc(firestore, `users/${uid}/categories/${id}`);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCategory(uid: string, id: string): Promise<{ success: boolean; error?: string }> {
  // Check if any transactions reference this category
  const txCol = collection(firestore, `users/${uid}/transactions`);
  const q = query(txCol, where("categoryId", "==", id));
  const txSnapshot = await getDocs(q);

  if (!txSnapshot.empty) {
    return {
      success: false,
      error: `ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากมีธุรกรรมอ้างอิงอยู่ ${txSnapshot.size} รายการ แนะนำให้เปลี่ยนหมวดหมู่ของธุรกรรมก่อน หรือใช้การซ่อน (Archive) แทน`,
    };
  }

  const docRef = doc(firestore, `users/${uid}/categories/${id}`);
  await deleteDoc(docRef);
  return { success: true };
}
