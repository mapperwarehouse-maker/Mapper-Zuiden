
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const askWarehouseAssistant = async (query: string, products: Product[]) => {
  // Fixed: Updated to access the 'ubicaciones' property as 'locations' does not exist on Product type.
  const context = products.slice(0, 50).map(p => 
    `SKU: ${p.sku}, Desc: ${p.descripcion}, Ubicaciones: ${p.ubicaciones.map(l => l.ubicacionId).join(', ')}, Cliente: ${p.cliente}`
  ).join('\n');

  const prompt = `
    Eres un asistente virtual para un almacén. Ayuda al usuario con su consulta basándote en los datos del almacén proporcionados.
    
    Consulta del usuario: "${query}"
    
    Datos de muestra del almacén:
    ${context}
    
    Reglas:
    1. Si el usuario pregunta por la ubicación de un cliente específico, resume dónde suele estar su mercancía.
    2. Si pregunta por un tipo de producto, sugiere las ubicaciones comunes.
    3. Sé conciso y profesional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini AI error:", error);
    return "Lo siento, tuve un problema procesando tu consulta de almacén.";
  }
};
