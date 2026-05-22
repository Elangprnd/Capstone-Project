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
      console.warn("Location not found for address:", address);
      return { latitude: null, longitude: null }; // Return null instead of throwing
    }

    // Ambil data pertama dari hasil pencarian
    const { lat, lon } = response.data[0];

    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon)
    };
  } catch (error: any) {
    // Menangani error dari axios (terutama 429 Too Many Requests)
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        console.warn("Geocoding rate limit exceeded (429). Falling back to null coordinates.");
        return { latitude: null, longitude: null };
      }
      console.error("Geocoding Axios Error:", error.message);
    } else {
      console.error("Geocoding Error:", error);
    }
    
    // Jangan sampai aplikasi crash karena gagal geocoding
    return { latitude: null, longitude: null };
  }
};