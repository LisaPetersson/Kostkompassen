import { foodAliases } from './food-aliases.js';

let foodDatabase = [];

fetch("data/livsmedel_mini.json")
  .then(res => res.json())
  .then(data => {
    foodDatabase = data;
    console.log("JSON LÄST! ✅", foodDatabase.length, "livsmedel");
    console.log("🔍 Exempelrad:", data[0]);
  })
  .catch(err => {
    console.error("🚫 FEL vid inläsning av JSON:", err);
  });

function analyzeMeal() {
  const meal = document.getElementById("meal").value.toLowerCase().trim();
  const glucose = parseFloat(document.getElementById("glucose").value);
  const responseBox = document.getElementById("response");

  if (!meal || isNaN(glucose)) {
    responseBox.innerHTML = "Vänligen fyll i både måltid och blodsockervärde.";
    responseBox.style.display = "block";
    return;
  }

  let mealItems = [];

  meal.split(',').map(w => w.trim().toLowerCase()).filter(Boolean).forEach(entry => {
    const parts = entry.split(" ").filter(Boolean);
    const lastPart = parts[parts.length - 1];
    const gram = parseFloat(lastPart);
    const userSpecified = !isNaN(gram);
    const baseText = userSpecified ? parts.slice(0, -1).join(" ") : parts.join(" ");
    const aliases = foodAliases[baseText];

    if (aliases && Array.isArray(aliases)) {
      const sharedGram = userSpecified ? gram / aliases.length : 100;
      aliases.forEach(term => {
        mealItems.push({ word: term, gram: sharedGram, userSpecified });
      });
    } else {
      mealItems.push({ word: baseText, gram: userSpecified ? gram : 100, userSpecified });
    }
  });

  let riskyItems = [];
  let matchedItems = [];
  let unknownItems = [];
  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let analysisOutput = "";

  mealItems.forEach(({ word, gram, userSpecified }) => {
    let match = null;

    if (foodAliases[word]) {
      match = foodDatabase.find(item => {
        const name = item.namn?.toLowerCase().trim();
        return foodAliases[word].some(alias => name.includes(alias));
      });
    }

    if (!match) {
      match = foodDatabase.find(item => {
        const name = item.namn?.toLowerCase().trim();
        return name && name.includes(word);
      });
    }

    console.log("Söker efter:", word);
    if (match) {
      console.log("→ Träffade:", match.namn);
      const carbs = (match.kolhydrater_g || 0) * gram / 100;
      const protein = (match.protein_g || 0) * gram / 100;
      const fat = (match.fett_g || 0) * gram / 100;

      totalCarbs += carbs;
      totalProtein += protein;
      totalFat += fat;

      matchedItems.push({ namn: match.namn, kolhydrater: carbs, protein, fett: fat, gi: match.gi, gram, userSpecified });

      if (carbs > 20) {
        riskyItems.push({ namn: match.namn, kolhydrater: carbs });
      }
    } else {
      unknownItems.push(word);
      console.warn("⚠️ Hittade inget för:", word);
    }
  });

  if (glucose > 8.5) {
    analysisOutput += `<p>Ditt blodsockervärde <strong>${glucose} mmol/L</strong> är något högt efter måltiden.</p>`;
    if (riskyItems.length > 0) {
      analysisOutput += `<p>Exempel på kolhydratrika delar i måltiden:</p><ul>`;
      riskyItems.forEach(item => {
        analysisOutput += `<li>${item.namn} – ${item.kolhydrater.toFixed(1)} g kolhydrater</li>`;
      });
      analysisOutput += `</ul><p>Försök byta ut eller minska dessa för att påverka ditt blodsocker positivt.</p>`;
    } else {
      analysisOutput += `<p>Vi kunde inte identifiera kolhydratrika livsmedel. Se över portionsstorlek eller fettinnehåll.</p>`;
    }
  } else {
    analysisOutput += `<p>Ditt blodsockervärde <strong>${glucose} mmol/L</strong> är inom god nivå efter denna måltid. Bra jobbat!</p>`;
  }

  if (matchedItems.length > 0) {
    analysisOutput += `<h3>Makronutrientöversikt</h3><ul>`;
    matchedItems.forEach(item => {
      const gText = item.userSpecified ? `${item.gram} g` : `100 g (standard)`;
      analysisOutput += `<li>${item.namn}: ${item.kolhydrater.toFixed(1)} g kolhydrater, ${item.protein.toFixed(1)} g protein, ${item.fett.toFixed(1)} g fett (GI: ${item.gi}) – ${gText}</li>`;
    });
    analysisOutput += `</ul><p><strong>Totalt:</strong> ${totalCarbs.toFixed(1)} g kolhydrater, ${totalProtein.toFixed(1)} g protein, ${totalFat.toFixed(1)} g fett</p>`;
  }

  if (unknownItems.length > 0) {
    analysisOutput += `<h3>Livsmedel utan information</h3><ul>`;
    unknownItems.forEach(word => {
      analysisOutput += `<li>Vi har för närvarande ingen information om <strong>${word}</strong>.</li>`;
    });
    analysisOutput += `</ul>`;
  }

  responseBox.innerHTML = analysisOutput;
  responseBox.style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
  const mealInput = document.getElementById("meal");
  if (mealInput) {
    mealInput.setAttribute("autocomplete", "off");
  }
});

window.analyzeMeal = analyzeMeal;
