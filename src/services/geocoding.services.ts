import axios from "axios";

/**
 * Fungsi Helper untuk mengubah alamat teks menjadi koordinat (Latitude & Longitude)
 * Menggunakan OpenStreetMap Nominatim API (Gratis & Tanpa Kartu)
 */
export const getCoordinates = async (address: string) => {
  try {
    // Nominatim membutuhkan User-Agent agar request tidak diblokir
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

    const response = await axios.get(url, {
      headers: { 
        "User-Agent": "Voletra-App-Student-Project" 
      }
    });

    // Validasi jika alamat tidak ditemukan
    if (!response.data || response.data.length === 0) {
      throw new Error("LOKASI_TIDAK_VALID");
    }

    // Ambil data pertama dari hasil pencarian
    const { lat, lon } = response.data[0];

    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon)
    };
  } catch (error) {
    // Log error untuk mempermudah debugging
    console.error("Geocoding Error:", error);
    throw error;
  }
};