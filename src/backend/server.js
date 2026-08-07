import { createApp } from "./app.js";
import { environment } from "./config/environment.js";

const app = createApp();

app.listen(environment.port, () => {
  console.log(`Server started at http://localhost:${environment.port}`);
});
