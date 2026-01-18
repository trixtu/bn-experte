"use server"

import { prisma } from "@/lib/prisma";
import { Assistant } from "@/prisma/lib/generated/prisma";

export async function saveAssistantToDb(data: Omit<Assistant, 'createdAt'>) {
  try {
    const newAssistant = await prisma.assistant.create({
      data: {
        ...data,
        id: data.id, // păstrăm ID-ul generat sau lăsăm Prisma să facă unul
      }
    });
    return newAssistant;
  } catch (error) {
    console.error("Database Save Error:", error);
    throw new Error("Nu s-a putut salva asistentul în baza de date.");
  }
}

export async function getAssistantsFromDb() {
  try {
    const assistants = await prisma.assistant.findMany();
    return assistants;
  } catch (error) {
    console.error("Database Fetch Error:", error);
    throw new Error("Nu s-au putut prelua asistenții din baza de date.");
  }
}

export async function deleteAssistantFromDb(id: string) {
  try {
    await prisma.assistant.delete({
      where: { id: id },
    });
    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    throw new Error("Nu s-a putut șterge asistentul din baza de date.");
  }
}