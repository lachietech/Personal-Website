import { NielsenWordmark } from "../../../components/NielsenWordmark.jsx";

export function Brand({ className = "" }) {
  return (
    <a className={className} href="#home" aria-label="Nielsen Innovations home">
      <NielsenWordmark />
    </a>
  );
}
