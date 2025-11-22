import Constants from "expo-constants";

export async function uploadToCloudinary(uri: string) {
  const cloud = (Constants.expoConfig as any)?.extra?.cloudinary?.cloudName;
  const preset = (Constants.expoConfig as any)?.extra?.cloudinary?.uploadPreset;

  if (!cloud || !preset) {
    throw new Error("Missing Cloudinary config");
  }

  // Lấy tên file
  const uriParts = uri.split("/");
  const fileName = uriParts[uriParts.length - 1];

  // Lấy type (mime type)
  const match = /\.(\w+)$/.exec(fileName);
  const type = match ? `image/${match[1]}` : "image";

  const formData = new FormData();
  formData.append("file", {
    uri,
    name: fileName,
    type,
  } as any);
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
