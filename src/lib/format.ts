export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

// Compact pour graphiques quand on peut grimper en millions.
// Ex : 1 500 000 -> "1,5 M FCFA", 5 000 -> "5 k FCFA", 500 -> "500 FCFA".
export function formatCompactFCFA(amount: number): string {
  if (Math.abs(amount) < 1000) {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  }
  return (
    new Intl.NumberFormat("fr-FR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount) + " FCFA"
  );
}
