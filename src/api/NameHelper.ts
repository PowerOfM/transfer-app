import { uniqueNamesGenerator, colors, animals } from "unique-names-generator";

export const generateName = () => {
  return uniqueNamesGenerator({
    dictionaries: [colors, animals],
    style: "capital",
    separator: "-",
  });
};
