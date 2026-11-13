import { readFile } from "node:fs/promises";
import Sales from "../models/Sales.js";
import { syncPosProductsFromSalesRecords } from "./posIntegration.js";

export async function loadSalesData() {
  let source;
  try {
    source = await readFile(new URL("../sales.json", import.meta.url), "utf8");
  } catch (error) {
    // This legacy seed file is optional and is not included in the repository.
    if (error.code === "ENOENT") return;
    throw error;
  }

  const { months, products } = JSON.parse(source);
  if (await Sales.countDocuments({})) return;

  const records = products.flatMap((product) =>
    product.sizes.map((variant) => ({
      category: product.category,
      size: variant.size,
      months,
      sales: variant.sales,
    })),
  );
  await Sales.insertMany(records);
  console.log(`Loaded ${records.length} HFSS uniforms sales records`);
}

export async function initialiseUniforms() {
  // POS synchronization must see the sales records inserted by the seed step.
  await loadSalesData();
  await syncPosProductsFromSalesRecords();
}
