import "../Scripts/style.css";

import { bootstrapDsqApp } from "./app/bootstrap";

bootstrapDsqApp().catch(error => {
  console.error("src/main.ts: bootstrap failed.", error);
});
