import { getProduct, getVehicle } from "./catalogue.js";
import { getPerformancePart } from "./club.js";
import {
  getInteriorPackage,
  getInteriorVariant,
  getSteeringOption,
} from "./interiors.js";
import { renderSteering } from "./interior-renderer.js";
import {
  assetUrl,
  CAR_TRANSFORMS,
  getSceneVariant,
  getUpgradeVariant,
} from "./scene.js";
import { renderCar } from "./paint-renderer.js";
import { renderUpgrades } from "./upgrade-renderer.js";

const load = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("The show-card artwork could not load."));
    img.src = url;
  });

/** Render from the saved snapshot, without moving or purchasing the active car. */
export async function createShowCard(build) {
  const choice = { ...build.selection, vehicle: build.vehicle };
  const variant = getSceneVariant(choice);
  if (!variant?.ready)
    throw new Error("This car's artwork is not available yet.");
  const [garage, base] = await Promise.all([
    load(assetUrl("assets/scene/garage-plate.png")),
    load(assetUrl(variant.src)),
  ]);
  const painted =
    choice.paint === "blue"
      ? base
      : await load(
          await renderCar(
            base,
            build.vehicle,
            getProduct("paint", choice.paint),
          ),
        );
  const [tyreImage, kitImage] = await Promise.all(
    ["tyre", "body"].map((kind) => {
      const asset = getUpgradeVariant(choice, kind);
      return asset ? load(assetUrl(asset.src)) : null;
    }),
  );
  const car = await load(
    await renderUpgrades(painted, build.vehicle, choice, {
      baseImage: base,
      tyreImage,
      kitImage,
    }),
  );
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 980;
  const ctx = canvas.getContext("2d"),
    scale = 1600 / 1672,
    t = CAR_TRANSFORMS[build.vehicle];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1600, 720);
  ctx.clip();
  ctx.drawImage(garage, 0, -40, 1600, 941 * scale);
  ctx.drawImage(
    car,
    t.left * scale,
    t.top * scale - 40,
    t.width * scale,
    t.height * scale,
  );
  const shade = ctx.createLinearGradient(0, 0, 0, 150);
  shade.addColorStop(0, "#111a15dd");
  shade.addColorStop(1, "#111a1500");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 1600, 150);
  ctx.fillStyle = "#b9ffcf";
  ctx.font = "700 24px Inter, sans-serif";
  ctx.fillText("SUNDAE RUN / BUILD CLUB", 52, 58);
  ctx.restore();
  ctx.fillStyle = "#fff8eb";
  ctx.fillRect(0, 720, 1600, 260);
  ctx.fillStyle = "#203629";
  ctx.font = "800 48px Inter, sans-serif";
  ctx.fillText(build.name, 52, 790, 1496);
  ctx.font = "600 25px Inter, sans-serif";
  ctx.fillText(getVehicle(build.vehicle).name, 52, 837);
  const line = [
    getProduct("paint", choice.paint).name,
    getProduct("wheel", choice.wheel).name,
    getProduct("tyre", choice.tyre).name,
    getProduct("suspension", choice.suspension).name,
    getProduct("body", choice.body).name,
  ];
  ctx.font = "400 20px Inter, sans-serif";
  ctx.fillText(line.join("  ·  "), 52, 884, 1496);
  ctx.fillText(
    Object.entries(build.spec)
      .map(([kind, id]) => getPerformancePart(kind, id).name)
      .concat(
        getInteriorPackage(build.interior ?? "stock").name,
        getSteeringOption(build.steering ?? "stock").name,
      )
      .join("  ·  "),
    52,
    920,
    1496,
  );
  ctx.fillStyle = "#647469";
  ctx.font = "400 15px Inter, sans-serif";
  ctx.fillText(
    "A Sundae Run concept build. Real product compatibility has not been verified.",
    52,
    954,
  );
  const result = canvas.toDataURL("image/png");
  canvas.width = 0;
  canvas.height = 0;
  return result;
}

export async function createInteriorCard(build) {
  const product = getInteriorPackage(build.interior ?? "stock"),
    variant = getInteriorVariant(build.vehicle, product?.id);
  if (!variant?.ready) throw new Error("The cabin artwork is not ready.");
  const image = await load(assetUrl(variant.src));
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1060;
  const ctx = canvas.getContext("2d");
  const cabin = renderSteering(image, build.vehicle, build.steering ?? "stock");
  ctx.drawImage(cabin, 0, 0, 1600, 900);
  ctx.fillStyle = "#fff8eb";
  ctx.fillRect(0, 900, 1600, 160);
  ctx.fillStyle = "#203629";
  ctx.font = '800 36px "Inter Variable", sans-serif';
  ctx.fillText(build.name, 40, 951, 1520);
  ctx.font = '500 23px "Inter Variable", sans-serif';
  ctx.fillText(
    `${getVehicle(build.vehicle).name} · ${product.name} · ${getSteeringOption(build.steering ?? "stock").name}`,
    40,
    995,
    1520,
  );
  ctx.font = '400 15px "Inter Variable", sans-serif';
  ctx.fillText(
    "Illustrated left-hand-drive cabin concept. Physical accessory fitment is unverified.",
    40,
    1031,
  );
  const result = canvas.toDataURL("image/png");
  canvas.width = 0;
  canvas.height = 0;
  return result;
}
