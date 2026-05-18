const base = import.meta.env.BASE_URL;

function img(folder: string, id: string): string {
  return `${base}images/${folder}/${id}.jpg`;
}

export const devCardImg = (id: string) => img("development-cards", id);
export const nobleCardImg = (id: string) => img("nobles", id);
export const cityCardImg = (id: string) => img("cities", id);
