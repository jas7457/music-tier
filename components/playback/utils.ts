import { useEffect, useState } from "react";

/*
function getProminentColor(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Important for external images

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      // Count color occurrences
      const colorCounts: Record<string, number> = {};

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const rgb = `${r},${g},${b}`;

        colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
      }

      // Find most common color
      let maxCount = 0;
      let prominentColor: string | null = null;

      for (const [color, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
          maxCount = count;
          prominentColor = color;
        }
      }

      resolve(`rgb(${prominentColor})`);
    };

    img.onerror = reject;
    img.src = imageUrl;
  });
}
*/

const colorCache: Record<string, Promise<string | undefined>> = {};

async function getAverageRGB(imageUrl: string): Promise<string | undefined> {
  // @ts-ignore
  if (colorCache[imageUrl]) {
    return colorCache[imageUrl];
  }
  const promise = new Promise<string | undefined>((resolve, reject) => {
    const blockSize = 5;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext && canvas.getContext("2d");
    const rgb = { r: 0, g: 0, b: 0 };

    let i = -4;
    let count = 0;
    let data;

    if (!context) {
      return resolve(undefined);
    }

    const imageElement = new Image();
    imageElement.crossOrigin = "Anonymous";
    imageElement.onload = () => {
      const height = (canvas.height =
        imageElement.naturalHeight ||
        imageElement.offsetHeight ||
        imageElement.height);
      const width = (canvas.width =
        imageElement.naturalWidth ||
        imageElement.offsetWidth ||
        imageElement.width);

      context.drawImage(imageElement, 0, 0);

      try {
        data = context.getImageData(0, 0, width, height);
      } catch (error) {
        console.log(error);
        debugger;
        /* security error, img on diff domain */
        return resolve(undefined);
      }

      const length = data.data.length;

      while ((i += blockSize * 4) < length) {
        ++count;
        rgb.r += data.data[i];
        rgb.g += data.data[i + 1];
        rgb.b += data.data[i + 2];
      }

      // ~~ used to floor values
      rgb.r = ~~(rgb.r / count);
      rgb.g = ~~(rgb.g / count);
      rgb.b = ~~(rgb.b / count);

      resolve(`rgb(${rgb.r},${rgb.g},${rgb.b})`);
    };

    imageElement.src = imageUrl;
    imageElement.onerror = reject;
  });

  colorCache[imageUrl] = promise;
  return promise;
}

export function useProminentColor(imageUrl: string, defaultColor?: string) {
  const [color, setColor] = useState<string | null>(defaultColor ?? null);

  useEffect(() => {
    (async () => {
      try {
        const color = await getAverageRGB(imageUrl);
        console.log({ color });
        if (color) {
          setColor(color);
        } else {
          setColor(defaultColor ?? null);
        }
      } catch {
        setColor(defaultColor ?? null);
      }
    })();
  }, [defaultColor, imageUrl]);

  return color;
}
