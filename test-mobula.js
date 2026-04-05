import axios from "axios";

async function main() {
  const MOBULA_KEY = "67a2ba93-2d56-4522-8301-7482ff07877f";
  const w = "7hJt4XpY4PqP19q5s1bT6XfT1N6L7dF9mR9Tf3Jb6qV1"; // Needs a real solana active wallet
  
  try {
    const res = await axios.get(`https://api.mobula.io/api/1/wallet/history?wallet=${w}`, {
      headers: { Authorization: MOBULA_KEY }
    });
    console.log("HISTORY RES", JSON.stringify(res.data).substring(0, 300));
  } catch (e) {
    console.error(e.message);
  }
}

main();
