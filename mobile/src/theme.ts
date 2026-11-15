export const colors = {
  maroon: "#840028",
  maroonSoft: "#fbe9ee",
  ink: "#212721",
  inkSoft: "#373a36",
  muted: "#6b7275",
  line: "#e3e5e6",
  paper: "#f6f6f4",
  white: "#ffffff",
  forest: "#44693d",
  forestSoft: "#eef4ec",
  gold: "#ffc72c",
};

/** Study mode is maroon; work mode is forest green, matching the web app. */
export function accent(mode: string | undefined) {
  return mode === "work" ? { main: colors.forest, soft: colors.forestSoft } : { main: colors.maroon, soft: colors.maroonSoft };
}

export const font = { bold: "Manrope_800ExtraBold", semi: "Manrope_600SemiBold" };
