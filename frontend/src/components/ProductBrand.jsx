import { productBrands } from "./productBrands.js";

export function ProductBrand({ product, showTagline = true }) {
  const brand = productBrands[product];
  return (
    <span className={`product-brand product-brand--${product}`}>
      <span className="product-brand-icon" aria-hidden="true">
        <i className={`bi ${brand.icon}`} />
      </span>
      <span className="product-brand-copy">
        <span>{brand.name}</span>
        {showTagline && <small>{brand.tagline}</small>}
      </span>
    </span>
  );
}
