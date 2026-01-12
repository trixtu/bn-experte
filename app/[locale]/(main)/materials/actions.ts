export async function deleteMaterial(materialId: number) {
  if (!materialId) throw new Error("Missing materialId");

  try {
    // Here you would add logic to delete the material from your database

   

    // succes ✅
    return { success: true, message: "Assistant deleted" };
  } catch (err: unknown) {
    let message = "Delete failed";

    if (err instanceof Error) {
      message = err.message;
    }

    return { success: false, message };
  }
}