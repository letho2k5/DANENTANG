import Constants from "expo-constants";

export async function uploadToCloudinary(file: any) {
  const cloud = (Constants.expoConfig as any)?.extra?.cloudinary?.cloudName;
  const preset = (Constants.expoConfig as any)?.extra?.cloudinary?.uploadPreset;

  if (!cloud || !preset) {
    throw new Error("Missing Cloudinary config");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}
