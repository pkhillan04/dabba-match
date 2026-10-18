// Per-100 g nutrition for recomputing a dish's macros from its ingredient list, so the numbers
// on a card come from the ingredients and not from the model's own arithmetic (models routinely
// under- or over-state macros). TABLE is a copy of STAPLES in public/index.html
// ([name, kcal, protein, carbs, fat, basis]); if you change nutrition values there, regenerate
// this table (see CLAUDE.md). Basis: dry = uncooked, raw, sold = as packed.

export const TABLE = [
  ["Eggs", 143, 12.6, 0.7, 9.5, "raw"],
  ["Egg whites", 52, 10.9, 0.7, 0.2, "raw"],
  ["Chicken breast", 120, 22.5, 0, 2.6, "raw"],
  ["Chicken thighs", 121, 19.7, 0, 4.1, "raw"],
  ["Chicken curry cut", 119, 21.4, 0, 3.1, "raw"],
  ["Chicken keema", 143, 17.4, 0, 8.1, "raw"],
  ["Mutton", 109, 20.6, 0, 2.3, "raw"],
  ["Fish", 96, 20.1, 0, 1.7, "raw"],
  ["Prawns", 85, 20.1, 0, 0.5, "raw"],
  ["Tuna (canned)", 86, 19.4, 0, 1, "sold"],
  ["Paneer", 323, 20, 4.5, 25, "sold"],
  ["Greek yogurt", 59, 10.2, 3.6, 0.4, "sold"],
  ["Curd (dahi)", 61, 3.5, 4.7, 3.3, "sold"],
  ["Whey protein", 390, 78, 8, 6, "sold"],
  ["Tofu", 144, 17.3, 2.8, 8.7, "sold"],
  ["Soya chunks", 345, 52, 33, 0.5, "dry"],
  ["Soya chaap", 271, 20.2, 34.8, 7.3, "sold"],
  ["Moong dal", 347, 23.9, 62.6, 1.2, "dry"],
  ["Toor dal", 343, 21.7, 62.8, 1.5, "dry"],
  ["Masoor dal", 352, 24.6, 63.4, 1.1, "dry"],
  ["Chana dal", 378, 20.5, 63, 6, "dry"],
  ["Urad dal", 341, 25.2, 59, 1.6, "dry"],
  ["Chole (kabuli chana)", 378, 20.5, 63, 6, "dry"],
  ["Kala chana", 378, 20.5, 63, 6, "dry"],
  ["Rajma", 333, 23.6, 60, 0.8, "dry"],
  ["Lobia", 336, 23.5, 60, 1.3, "dry"],
  ["Moong sprouts", 30, 3, 5.9, 0.2, "raw"],
  ["Sattu", 374, 22, 58, 6, "dry"],
  ["Peanuts", 567, 25.8, 16.1, 49.2, "raw"],
  ["Rice", 365, 7.1, 80, 0.7, "dry"],
  ["Brown rice", 367, 7.5, 76.3, 3.2, "dry"],
  ["Roti / atta", 340, 13.2, 72, 2.5, "dry"],
  ["Maida", 364, 10.3, 76.3, 1, "dry"],
  ["Besan", 387, 22.4, 57.8, 6.7, "dry"],
  ["Oats", 379, 13.2, 67.7, 6.5, "dry"],
  ["Poha", 346, 6.6, 77.3, 1.2, "dry"],
  ["Suji / rava", 360, 12.7, 72.8, 1.1, "dry"],
  ["Dalia", 342, 12.3, 75.9, 1.3, "dry"],
  ["Vermicelli (seviyan)", 371, 13, 74.7, 1.5, "dry"],
  ["Bajra", 378, 11, 72.9, 4.2, "dry"],
  ["Jowar", 329, 10.6, 72.1, 3.5, "dry"],
  ["Ragi", 321, 7.2, 66.8, 1.9, "dry"],
  ["Makhana", 347, 9.7, 76.9, 0.1, "dry"],
  ["Bread", 266, 8.9, 49.4, 3.3, "sold"],
  ["Brown bread", 252, 12.5, 42.7, 3.5, "sold"],
  ["Wraps / tortilla", 297, 8, 49.3, 7.6, "sold"],
  ["Pasta", 371, 13, 74.7, 1.5, "dry"],
  ["Quinoa", 368, 14.1, 64.2, 6.1, "dry"],
  ["Potato", 77, 2, 17.5, 0.1, "raw"],
  ["Sweet potato", 86, 1.6, 20.1, 0.1, "raw"],
  ["Sweet corn", 86, 3.3, 18.7, 1.4, "raw"],
  ["Milk", 61, 3.2, 4.8, 3.3, "sold"],
  ["Chaas / buttermilk", 40, 3.3, 4.8, 1.1, "sold"],
  ["Butter", 717, 0.9, 0.1, 81.1, "sold"],
  ["Ghee", 900, 0, 0, 100, "sold"],
  ["Fresh cream (malai)", 292, 2.2, 3, 30.9, "sold"],
  ["Cheese", 366, 18.1, 4.8, 30.7, "sold"],
  ["Mozzarella", 254, 24.3, 2.8, 15.9, "sold"],
  ["Cream cheese", 350, 6.2, 5.5, 34.4, "sold"],
  ["Almonds", 579, 21.2, 21.6, 49.9, "raw"],
  ["Cashews", 553, 18.2, 30.2, 43.9, "raw"],
  ["Walnuts", 654, 15.2, 13.7, 65.2, "raw"],
  ["Peanut butter", 598, 22.2, 22.3, 51.4, "sold"],
  ["Flaxseed (alsi)", 534, 18.3, 28.9, 42.2, "raw"],
  ["Chia seeds", 486, 16.5, 42.1, 30.7, "raw"],
  ["Pumpkin seeds", 559, 30.2, 10.7, 49.1, "raw"],
  ["Til (sesame)", 573, 17.7, 23.5, 49.7, "raw"],
  ["Olive oil", 884, 0, 0, 100, "sold"],
  ["Mustard oil", 884, 0, 0, 100, "sold"],
  ["Coconut", 354, 3.3, 15.2, 33.5, "raw"],
  ["Onion", 40, 1.1, 9.3, 0.1, "raw"],
  ["Tomato", 18, 0.9, 3.9, 0.2, "raw"],
  ["Spinach", 23, 2.9, 3.6, 0.4, "raw"],
  ["Methi leaves", 49, 4.4, 6, 0.9, "raw"],
  ["Sarson greens", 27, 2.9, 4.7, 0.4, "raw"],
  ["Capsicum", 20, 0.9, 4.6, 0.2, "raw"],
  ["Mixed veggies", 72, 3.3, 13.5, 0.5, "raw"],
  ["Peas", 81, 5.4, 14.5, 0.4, "raw"],
  ["Carrot", 41, 0.9, 9.6, 0.2, "raw"],
  ["Cucumber", 15, 0.7, 3.6, 0.1, "raw"],
  ["Mushroom", 22, 3.1, 3.3, 0.3, "raw"],
  ["Cauliflower", 25, 1.9, 5, 0.3, "raw"],
  ["Cabbage", 25, 1.3, 5.8, 0.1, "raw"],
  ["Broccoli", 34, 2.8, 6.6, 0.4, "raw"],
  ["French beans", 31, 1.8, 7, 0.2, "raw"],
  ["Bhindi", 33, 1.9, 7.5, 0.2, "raw"],
  ["Baingan", 25, 1, 5.9, 0.2, "raw"],
  ["Lauki", 14, 0.6, 3.4, 0, "raw"],
  ["Kaddu (pumpkin)", 26, 1, 6.5, 0.1, "raw"],
  ["Beetroot", 43, 1.6, 9.6, 0.2, "raw"],
  ["Mooli", 16, 0.7, 3.4, 0.1, "raw"],
  ["Spring onion", 32, 1.8, 7.3, 0.2, "raw"],
  ["Banana", 89, 1.1, 22.8, 0.3, "raw"],
  ["Apple", 52, 0.3, 13.8, 0.2, "raw"],
  ["Berries", 32, 0.7, 7.7, 0.3, "raw"],
  ["Mango", 60, 0.8, 15, 0.4, "raw"],
  ["Papaya", 43, 0.5, 10.8, 0.3, "raw"],
  ["Orange", 47, 0.9, 11.8, 0.1, "raw"],
  ["Guava", 68, 2.6, 14.3, 1, "raw"],
  ["Pomegranate", 83, 1.7, 18.7, 1.2, "raw"],
  ["Garlic", 149, 6.4, 33.1, 0.5, "raw"],
  ["Ginger", 80, 1.8, 17.8, 0.8, "raw"],
  ["Green chilli", 40, 2, 9.5, 0.2, "raw"],
  ["Lemon", 29, 1.1, 9.3, 0.3, "raw"],
  ["Coriander", 23, 2.1, 3.7, 0.5, "raw"],
  ["Pudina (mint)", 44, 3.3, 8.4, 0.7, "raw"],
  ["Basic masala", 325, 14.3, 55.8, 14, "sold"],
  ["Haldi", 312, 9.7, 67.1, 3.3, "sold"],
  ["Jeera", 375, 17.8, 44.2, 22.3, "sold"],
  ["Red chilli powder", 318, 12, 56.6, 17.3, "sold"],
  ["Dhania powder", 298, 12.4, 55, 17.8, "sold"],
  ["Garam masala", 325, 14.3, 55.8, 14, "sold"],
  ["Chaat masala", 325, 14.3, 55.8, 14, "sold"],
  ["Rai (mustard seeds)", 508, 26.1, 28.1, 36.2, "sold"],
  ["Black pepper", 251, 10.4, 64, 3.3, "sold"],
  ["Chilli flakes", 318, 12, 56.6, 17.3, "sold"],
  ["Imli (tamarind)", 239, 2.8, 62.5, 0.6, "sold"],
  ["Tomato puree", 38, 1.7, 9, 0.2, "sold"],
  ["Tomato ketchup", 101, 1, 27.4, 0.1, "sold"],
  ["Chilli sauce", 93, 1.9, 19.2, 0.9, "sold"],
  ["Soy sauce", 53, 8.1, 4.9, 0.6, "sold"],
  ["Vinegar", 21, 0, 0.9, 0, "sold"],
  ["Honey", 304, 0.3, 82.4, 0, "sold"],
  ["Jaggery (gur)", 380, 0.1, 98.1, 0, "sold"],
  ["Sugar", 387, 0, 100, 0, "sold"],
  ["Dates", 282, 2.5, 75, 0.4, "raw"]
];

const BY_NAME = new Map(TABLE.map((r) => [r[0], r]));
const get = (name) => BY_NAME.get(name);

// Most specific first. Maps what an ingredient is called in a recipe to a TABLE row, or to
// fixed numbers ([kcal, protein, carbs, fat]) for things not in the table, or to ZERO.
const ZERO = [0, 0, 0, 0];
const PATTERNS = [
  [/\b(salt|namak|water|ice(?! cream)|baking (soda|powder)|food colou?r)\b/i, ZERO],
  [/\bginger[- ]garlic\b/i, "Garlic"],
  [/\bchill?i powder\b|\b(red chill?i|lal mirch|kashmiri)\b/i, "Red chilli powder"],
  [/\b(cooking |refined |vegetable |sunflower |rice bran |groundnut |canola )?oil\b/i, [884, 0, 0, 100], "mustard|olive"],
  [/\bmustard oil\b/i, "Mustard oil"],
  [/\bolive oil\b/i, "Olive oil"],
  [/\bghee\b/i, "Ghee"],
  [/\bbutter\b/i, "Butter", "peanut|almond|nut"],
  [/\bpeanut butter\b/i, "Peanut butter"],
  [/\b(soya?|soy) (chunks?|granules|nuggets|badi)\b|\bnutrela\b|\bmeal maker\b/i, "Soya chunks"],
  [/\b(soya?|soy) chaap\b|\bchaap\b/i, "Soya chaap"],
  [/\b(soy|soya) sauce\b/i, "Soy sauce"],
  [/\begg whites?\b/i, "Egg whites"],
  [/\b(eggs?|anda)\b/i, "Eggs"],
  [/\bchicken (keema|mince)\b/i, "Chicken keema"],
  [/\bchicken (breast|boneless)\b/i, "Chicken breast"],
  [/\bchicken (thighs?|leg)\b/i, "Chicken thighs"],
  [/\bchicken\b/i, "Chicken curry cut"],
  [/\b(mutton|goat|lamb)\b/i, "Mutton"],
  [/\b(prawns?|shrimps?|jhinga)\b/i, "Prawns"],
  [/\btuna\b/i, "Tuna (canned)"],
  [/\b(fish|rohu|basa|tilapia|surmai|pomfret)\b/i, "Fish"],
  [/\bpaneer\b/i, "Paneer"],
  [/\bgreek yo?gh?urt\b|\bhung curd\b/i, "Greek yogurt"],
  [/\b(curd|dahi|yo?gh?urt)\b/i, "Curd (dahi)"],
  [/\b(chaas|buttermilk|lassi)\b/i, "Chaas / buttermilk"],
  // Plant milks per 100 ml (USDA): coconut milk canned, soy and almond unsweetened, oat.
  [/\bcoconut milk\b/i, [197, 2.0, 2.8, 21.3]],
  [/\b(soy|soya) milk\b/i, [54, 3.3, 6.3, 1.8]],
  [/\balmond milk\b/i, [15, 0.6, 0.3, 1.2]],
  [/\boat milk\b/i, [48, 1.0, 6.7, 2.0]],
  [/\bmilk\b/i, "Milk"],
  [/\bcream cheese\b/i, "Cream cheese"],
  [/\bice cream\b/i, [207, 3.5, 23.6, 11]], // vanilla, USDA
  [/\b(cream|malai)\b/i, "Fresh cream (malai)"],
  [/\bmozzarella\b/i, "Mozzarella"],
  [/\b(cheese)\b/i, "Cheese"],
  [/\btofu\b/i, "Tofu"],
  [/\bwhey\b|\bprotein powder\b/i, "Whey protein"],
  [/\b(rajma|kidney beans?)\b/i, "Rajma"],
  [/\b(chole|kabuli|chick ?peas?)\b/i, "Chole (kabuli chana)"],
  [/\bkala chana\b|\bblack chickpeas?\b/i, "Kala chana"],
  [/\b(lobia|black[- ]eyed)\b/i, "Lobia"],
  [/\bchana dal\b/i, "Chana dal"],
  [/\b(toor|arhar|tuvar)( dal)?\b/i, "Toor dal"],
  [/\bmasoor\b/i, "Masoor dal"],
  [/\burad\b/i, "Urad dal"],
  [/\bmoong sprouts?\b|\bsprouts?\b/i, "Moong sprouts"],
  [/\bmoong\b|\b(dal|daal|lentils?)\b/i, "Moong dal"],
  [/\bsattu\b/i, "Sattu"],
  [/\bbesan\b|\bgram flour\b/i, "Besan"],
  [/\bmaida\b/i, "Maida"],
  [/\b(atta|wheat flour|roti|chapati|chapatti|phulka|paratha)\b/i, "Roti / atta"],
  [/\b(suji|rava|semolina|sooji)\b/i, "Suji / rava"],
  [/\bdalia|broken wheat\b/i, "Dalia"],
  [/\b(vermicelli|seviyan)\b/i, "Vermicelli (seviyan)"],
  [/\bbajra\b/i, "Bajra"], [/\bjowar\b/i, "Jowar"], [/\bragi\b/i, "Ragi"],
  [/\bmakhana|fox nuts?\b/i, "Makhana"],
  [/\bpoha|flattened rice\b/i, "Poha"],
  [/\boats?\b|\boatmeal\b/i, "Oats"],
  [/\bbrown rice\b/i, "Brown rice"],
  [/\b(rice|chawal|basmati)\b/i, "Rice", "flour|noodles?"],
  [/\bbrown bread\b/i, "Brown bread"],
  [/\b(bread|pav|bun)\b/i, "Bread"],
  [/\b(wraps?|tortillas?)\b/i, "Wraps / tortilla"],
  [/\b(pasta|macaroni|spaghetti|penne|noodles?)\b/i, "Pasta"],
  [/\bquinoa\b/i, "Quinoa"],
  [/\bsweet potato|shakarkandi\b/i, "Sweet potato"],
  [/\b(potato(es)?|aloo)\b/i, "Potato"],
  [/\b(sweet ?corn|corn)\b/i, "Sweet corn"],
  [/\bpeanuts?|moongphali\b/i, "Peanuts"],
  [/\balmonds?|badam\b/i, "Almonds"],
  [/\bcashews?|kaju\b/i, "Cashews"],
  [/\bwalnuts?|akhrot\b/i, "Walnuts"],
  [/\b(flax|alsi)/i, "Flaxseed (alsi)"],
  [/\bchia\b/i, "Chia seeds"],
  [/\bpumpkin seeds?\b/i, "Pumpkin seeds"],
  [/\b(til|sesame)\b/i, "Til (sesame)"],
  [/\bcoconut\b/i, "Coconut"],
  [/\b(spring onions?|green onions?)\b/i, "Spring onion"],
  [/\b(onions?|pyaz)\b/i, "Onion"],
  [/\btomato (puree|paste)\b|\bpuree\b/i, "Tomato puree"],
  [/\b(ketchup)\b/i, "Tomato ketchup"],
  [/\btomato(es)?\b/i, "Tomato"],
  [/\b(spinach|palak)\b/i, "Spinach"],
  [/\b(methi leaves|fenugreek leaves|methi)\b/i, "Methi leaves"],
  [/\bsarson\b/i, "Sarson greens"],
  [/\b(capsicum|bell pepper|shimla)\b/i, "Capsicum"],
  [/\b(mixed veg\w*|vegetables?)\b/i, "Mixed veggies"],
  [/\b(peas|matar)\b/i, "Peas"],
  [/\b(carrots?|gajar)\b/i, "Carrot"],
  [/\b(cucumber|kheera)\b/i, "Cucumber"],
  [/\bmushrooms?\b/i, "Mushroom"],
  [/\b(cauliflower|gobhi)\b/i, "Cauliflower"],
  [/\b(cabbage|patta gobhi)\b/i, "Cabbage"],
  [/\bbroccoli\b/i, "Broccoli"],
  [/\b(french beans?|green beans?|beans)\b/i, "French beans"],
  [/\b(bhindi|okra)\b/i, "Bhindi"],
  [/\b(baingan|brinjal|eggplant|aubergine)\b/i, "Baingan"],
  [/\blauki|bottle gourd\b/i, "Lauki"],
  [/\b(kaddu|pumpkin)\b/i, "Kaddu (pumpkin)"],
  [/\bbeetroot\b/i, "Beetroot"], [/\b(mooli|radish)\b/i, "Mooli"],
  [/\bbanana\b/i, "Banana"], [/\bapple\b/i, "Apple"], [/\b(berries|strawberr\w*|blueberr\w*)\b/i, "Berries"],
  [/\bmango\b/i, "Mango"], [/\bpapaya\b/i, "Papaya"], [/\borange\b/i, "Orange"], [/\bguava\b/i, "Guava"], [/\bpomegranate\b/i, "Pomegranate"],
  [/\bgarlic|lehsun\b/i, "Garlic"], [/\bginger|adrak\b/i, "Ginger"],
  [/\b(green chill(i|ies)|hari mirch|chill(i|ies))\b(?!.*(powder|flakes|sauce))/i, "Green chilli"],
  [/\b(lemon|lime|nimbu)\b/i, "Lemon"],
  [/\b(coriander|dhania|cilantro)( leaves)?\b(?!.*powder)/i, "Coriander"],
  [/\b(pudina|mint)\b/i, "Pudina (mint)"],
  [/\bhaldi|turmeric\b/i, "Haldi"],
  [/\b(jeera|cumin)\b/i, "Jeera"],

  [/\b(dhania|coriander) powder\b/i, "Dhania powder"],
  [/\bgaram masala\b/i, "Garam masala"],
  [/\bchaat masala\b/i, "Chaat masala"],
  [/\b(rai|mustard seeds?)\b/i, "Rai (mustard seeds)"],
  [/\b(black pepper|kali mirch|pepper)\b/i, "Black pepper"],
  [/\bchill?i flakes\b/i, "Chilli flakes"],
  [/\b(imli|tamarind)\b/i, "Imli (tamarind)"],
  [/\bchill?i sauce\b/i, "Chilli sauce"],
  [/\bvinegar\b/i, "Vinegar"],
  [/\bhoney\b/i, "Honey"], [/\b(jaggery|gur)\b/i, "Jaggery (gur)"], [/\bsugar\b/i, "Sugar"], [/\bdates?\b/i, "Dates"],
  [/\b(masala|kasuri|hing|asafoetida|ajwain|kalonji|saunf|fennel|cinnamon|dalchini|cardamom|elaichi|laung|cloves?|bay|tej patta|oregano|amchur)\b/i, "Basic masala"],
];

// Weights of things measured by spoon, cup, piece and so on.
const PIECE_G = [[/\bonions?\b/i, 100], [/\btomato(es)?\b/i, 100], [/\bsweet potato/i, 150], [/\bpotato(es)?|\baloo\b/i, 150], [/\bcapsicum|bell pepper/i, 120], [/\bcarrots?\b/i, 70], [/\bcucumber/i, 200], [/\blemons?|\blimes?|nimbu/i, 50], [/\beggs?\b/i, 50], [/\bbanana/i, 120], [/\bapple/i, 180], [/\bgreen chill|\bchill(i|ies)\b/i, 5], [/\bbeetroot/i, 120], [/\bbread\b|\bslices?\b/i, 25], [/\bparathas?\b/i, 50], [/\b(roti|chapati|phulka)s?\b/i, 30], [/\b(wrap|tortilla)\b/i, 60], [/\bmango/i, 200], [/\borange/i, 130], [/\bguava/i, 100], [/\bdates?\b/i, 8], [/\bcloves?\b|\bgarlic\b/i, 3], [/\bcashews?|kaju\b/i, 1.5], [/\balmonds?|badam\b/i, 1.2], [/\bwalnuts?|akhrot\b/i, 4], [/\bpaneer\b/i, 25], [/\bidlis?\b/i, 40]];
const KATORI_G = [[/\b(curd|dahi|yogh?urt)\b/i, 150], [/\b(milk|buttermilk|chaas)\b/i, 150], [/\b(peas|matar|corn|sprouts|mixed veg\w*)\b/i, 100], [/\b(spinach|palak|methi|sarson)\b/i, 50], [/\b(cabbage|cauliflower|gobhi|beans|mushrooms?|broccoli|bhindi|lauki|kaddu|pumpkin)\b/i, 80], [/\b(cooked|boiled|steamed|soaked)\b/i, 150], [/\b(rice|dal|rajma|chole|chana|lobia|poha|oats|suji|rava)\b/i, 120]];
// Grams in one level cup (240 ml) of things that are much lighter or heavier than water.
const CUP_G = [[/\b(cooked|boiled|steamed)\b/i, 170], [/\b(soya?|soy) (chunks?|granules|badi)\b|\bnutrela\b/i, 50], [/\boats?\b/i, 85], [/\bpoha\b/i, 75], [/\b(makhana|puffed|murmura|cornflakes)\b/i, 15], [/\b(spinach|palak|methi|sarson|lettuce|coriander|leaves)\b/i, 30], [/\b(flour|atta|besan|maida|sattu)\b/i, 125], [/\b(suji|rava|sooji|semolina)\b/i, 170], [/\b(rice|dal|lentils?|rajma|chole|chana|lobia|quinoa|dalia)\b/i, 190], [/\b(peanuts?|cashews?|almonds?|walnuts?|nuts)\b/i, 140], [/\b(cabbage|cauliflower|gobhi|beans|mushrooms?|broccoli|capsicum|onions?|carrots?|veg\w*)\b/i, 120], [/\b(peas|matar|corn|sprouts)\b/i, 150], [/\b(curd|dahi|yogh?urt|milk|cream|water|stock|puree)\b/i, 245]];
const COOKED = /\b(boiled|cooked|canned|tinned|leftover|steamed|soaked)\b/i;
const FATTY = /\b(oil|ghee|butter)\b/i;
const POWDERY = /\b(masala|powder|haldi|turmeric|jeera|cumin|pepper|chaat|garam|hing|flakes|seeds?)\b/i;

function pick(list, name) {
  for (const [re, g] of list) if (re.test(name)) return g;
  return 0;
}

// What an ingredient name stands for: { row: [kcal, p, c, f], basis, label } or null.
export function lookup(name) {
  const n = String(name || "");
  for (const [re, target, except] of PATTERNS) {
    if (!re.test(n)) continue;
    if (except && new RegExp(except, "i").test(n)) continue;
    if (Array.isArray(target)) return { row: target, basis: "sold", label: "fixed" };
    const r = get(target);
    if (r) return { row: [r[1], r[2], r[3], r[4]], basis: r[5], label: target };
  }
  return null;
}

// Grams for one ingredient ({name, qty, unit, g}); 0 when it can't be told.
export function gramsOf(ing, hit) {
  const name = String(ing.name || "");
  const g = Number(ing.g) || 0;
  if (g > 0) return g;
  const q = Number(ing.qty) || 0;
  const u = String(ing.unit || "").toLowerCase();
  if (!q || u === "taste" || u === "note") return 0;
  if (u === "g") return q;
  if (u === "kg") return q * 1000;
  const fat = FATTY.test(name), spice = POWDERY.test(name);
  const tsp = fat ? 4.5 : /\bsalt\b/i.test(name) ? 6 : /\bsugar|honey|jaggery|gur\b/i.test(name) ? 5 : spice ? 2.5 : /\b(flour|besan|atta|sattu|oats|protein)\b/i.test(name) ? 3 : 5;
  if (u === "tsp" || u === "teaspoon" || u === "teaspoons") return q * tsp;
  if (u === "tbsp" || u === "tablespoon" || u === "tablespoons") return q * tsp * 3;
  if (u === "cup" || u === "cups") return q * (pick(CUP_G, name) || 240);
  if (u === "block" || u === "blocks") return q * (/\btofu\b/i.test(name) ? 200 : 200);
  if (u === "scoop" || u === "scoops") return q * 30;
  if (u === "glass") return q * 250;
  if (u === "ml") return q;
  if (u === "katori") return q * (pick(KATORI_G, name) || 120);
  if (u === "pinch") return q * 0.4;
  if (u === "inch") return q * 6;
  if (u === "cloves") return q * 3;
  if (u === "slices") return q * 25;
  if (u === "pcs" || u === "" || u === "piece" || u === "pieces") return q * (pick(PIECE_G, name) || 0);
  return 0;
}

const COOK_FACTOR = (label) => (/rice|dalia|pasta|vermicelli|quinoa|oats|poha/i.test(label) ? 0.38 : 0.4);

function toNum(v) {
  if (typeof v === "number") return v;
  const t = String(v ?? "").trim();
  let m;
  if ((m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/))) return +m[1] + m[2] / m[3];
  if ((m = t.match(/^(\d+)\/(\d+)$/))) return m[1] / m[2];
  return parseFloat(t) || 0;
}

// Macros of one serving, from the ingredient list (quantities are for one serving). Returns
// { kcal, protein, carbs, fat, coverage, unmatched[] }; coverage is the share of ingredients (not
// counting salt and water) that could be priced.
export function recompute(dish) {
  const list = Array.isArray(dish.ingredients) ? dish.ingredients : [];
  let p = 0, c = 0, f = 0, kcal = 0, total = 0, priced = 0;
  const unmatched = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const ing = { name: raw.name, qty: toNum(raw.qty), unit: raw.unit, g: toNum(raw.g) };
    const hit = lookup(ing.name);
    if (hit && hit.label === "fixed" && hit.row[0] === 0) continue; // salt, water
    if (hit && hit.row[0] === 0 && hit.row[1] === 0 && hit.row[2] === 0 && hit.row[3] === 0) continue;
    const taste = String(ing.unit || "").toLowerCase() === "taste" || (!ing.qty && !ing.g);
    if (taste) continue; // "to taste": no macros worth counting
    total++;
    let grams = hit ? gramsOf(ing, hit) : 0;
    if (!hit || !grams) { unmatched.push(String(ing.name)); continue; }
    if (hit.basis === "dry" && COOKED.test(ing.name)) grams *= COOK_FACTOR(hit.label);
    priced++;
    const k = grams / 100;
    kcal += hit.row[0] * k; p += hit.row[1] * k; c += hit.row[2] * k; f += hit.row[3] * k;
  }
  return {
    protein: Math.round(p),
    carbs: Math.round(c),
    fat: Math.round(f),
    kcal: Math.round(p) * 4 + Math.round(c) * 4 + Math.round(f) * 9,
    coverage: total ? priced / total : 0,
    unmatched,
  };
}

// ---------------------------------------------------------------------------------------------
// fitToTarget(dish, target): nudges ingredient amounts so one serving lands near the meal target.
// Models write good recipes but get the amounts wrong (too much paneer and oil for a low-fat target,
// a huge rice portion for a cut). Instead of throwing such a dish away, each ingredient that carries
// real calories gets a multiplier within sensible bounds (oil and cream can go down a lot, the main
// protein and carb can move more, vegetables a little, spices not at all), chosen to bring protein,
// carbs, fat and calories closest to the target. Amounts are then rounded to kitchen-friendly
// numbers and the result is checked again. Returns { dish, before, after } or null when it cannot
// be improved. Steps never mention amounts, so they stay correct.
const FAT_SOURCE = /\b(oil|ghee|butter|cream|malai|mayo\w*)\b/i;
const LOW_CAL_VEG = /\b(onions?|tomato(es)?|spinach|palak|capsicum|carrots?|cucumber|cabbage|cauliflower|gobhi|beans|mushrooms?|broccoli|methi|coriander|lettuce|peas|matar|bhindi|lauki|baingan|garlic|ginger|chill)/i;

function err(m, t) {
  const kcal = m.p * 4 + m.c * 4 + m.f * 9;
  return 1.0 * ((m.p - t.protein) / Math.max(t.protein, 1)) ** 2 + 0.5 * ((m.c - t.carbs) / Math.max(t.carbs, 1)) ** 2 +
    0.6 * ((m.f - t.fat) / Math.max(t.fat, 1)) ** 2 + 1.2 * ((kcal - t.kcal) / Math.max(t.kcal, 1)) ** 2;
}

function roundQty(q, unit, name) {
  const u = String(unit || "").toLowerCase();
  if (u === "g" || u === "ml") return Math.max(5, Math.round(q / 5) * 5);
  if (/^(pcs|pieces?|)$/.test(u)) return /\beggs?\b/i.test(name) ? Math.max(1, Math.round(q)) : Math.max(0.5, Math.round(q * 2) / 2);
  if (/^(tsp|tbsp|katori|cups?|glass|scoops?|blocks?|slices?)$/.test(u)) return Math.max(0.25, Math.round(q * 4) / 4);
  return q;
}

export function fitToTarget(dish, target) {
  const t = target;
  if (!t || !(t.kcal > 0) || !Array.isArray(dish.ingredients)) return null;
  const items = dish.ingredients.map((raw) => {
    const ing = { name: raw.name, qty: toNum(raw.qty), unit: raw.unit, g: toNum(raw.g) };
    const hit = lookup(ing.name);
    let grams = hit ? gramsOf(ing, hit) : 0;
    if (hit && hit.basis === "dry" && COOKED.test(ing.name)) grams *= COOK_FACTOR(hit.label);
    const per = hit && grams ? hit.row.map((x) => x / 100) : [0, 0, 0, 0]; // per gram
    const contrib = { p: per[1] * grams, c: per[2] * grams, f: per[3] * grams };
    const kcal = contrib.p * 4 + contrib.c * 4 + contrib.f * 9;
    let lo = 1, hi = 1;
    if (kcal >= 15) {
      if (FAT_SOURCE.test(ing.name)) [lo, hi] = [0.3, 1.3];
      else if (LOW_CAL_VEG.test(ing.name)) [lo, hi] = [0.7, 1.5];
      else [lo, hi] = [0.4, 1.8];
    }
    return { raw, ing, contrib, lo, hi, m: 1 };
  });
  const sum = () => items.reduce((s, it) => ({ p: s.p + it.contrib.p * it.m, c: s.c + it.contrib.c * it.m, f: s.f + it.contrib.f * it.m }), { p: 0, c: 0, f: 0 });
  const before = sum();
  const e0 = err(before, t);
  const free = items.filter((it) => it.hi > it.lo);
  if (!free.length) return null;
  // Coordinate descent: each multiplier in turn moves to its best value (the error is quadratic in
  // one multiplier, so try a fine grid within its bounds), a few sweeps over all of them.
  for (let sweep = 0; sweep < 12; sweep++) {
    for (const it of free) {
      let best = it.m, bestE = Infinity;
      for (let k = 0; k <= 26; k++) {
        it.m = it.lo + ((it.hi - it.lo) * k) / 26;
        const e = err(sum(), t) + 0.02 * (it.m - 1) ** 2;
        if (e < bestE) [bestE, best] = [e, it.m];
      }
      it.m = best;
    }
  }
  // Rewrite amounts with kitchen rounding, then score what the cook will actually see.
  const ingredients = items.map((it) => {
    if (Math.abs(it.m - 1) < 0.06) return it.raw;
    const out = { ...it.raw };
    const q = toNum(it.raw.qty), g = toNum(it.raw.g);
    if (g) {
      // Weighed items: the grams are what the page shows, so round those and keep qty in step.
      out.g = Math.max(5, Math.round((g * it.m) / 5) * 5);
      if (q) out.qty = Math.round(q * (out.g / g) * 100) / 100;
    } else if (q) out.qty = roundQty(q * it.m, it.raw.unit, it.raw.name);
    return out;
  });
  const fitted = { ...dish, ingredients };
  const rc = recompute(fitted);
  const after = { p: rc.protein, c: rc.carbs, f: rc.fat };
  if (rc.coverage < 0.8 || err(after, t) >= e0 * 0.8) return null;
  return { dish: Object.assign(fitted, { protein: rc.protein, carbs: rc.carbs, fat: rc.fat }), before, after: { ...after, kcal: rc.kcal } };
}
