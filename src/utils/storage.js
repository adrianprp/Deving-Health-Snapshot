import fs from "fs";
import path from "path";

const FILE_PATH = path.resolve("history.json");
console.log(FILE_PATH);

const loadHistory = () => {
  if (!fs.existsSync(FILE_PATH)) return [];
  return JSON.parse(fs.readFileSync(FILE_PATH));
};

export const saveSnapshot = (snapshot) => {
  const history = loadHistory();

  history.push(snapshot);

  fs.writeFileSync(
    FILE_PATH,
    JSON.stringify(history, null, 2)
  );
};