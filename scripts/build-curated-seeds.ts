import { writeFileSync } from 'node:fs';
import { HELDOUT_ITEMS, HELDOUT_KEY_TERMS } from '../src/lib/categoryEmbed/heldout.ts';
import { normalizeSeedText, type SeedFile } from '../src/lib/categoryEmbed/seedData.ts';

const ORIGINAL_SEEDS: Record<string, string[]> = {
    "Food & Dining": [
        "lunch", "dinner", "breakfast", "snacks", "restaurant", "cafe", "coffee", "tea", "burger", "pizza", "kfc",
        "biryani", "kacchi", "tehari", "haleem", "sweets", "dessert", "ice cream", "juice", "foodpanda", "food delivery",
        "takeout", "street food", "fuchka", "chotpoti", "samosa", "puri",
        "cha", "nasta", "nashta", "khabar", "khawa dawa", "dupurer khabar", "raater khabar", "sokaler nasta",
        "mishti", "fuska", "singara", "hotel e khawa",
        "চা", "নাস্তা", "খাবার", "দুপুরের খাবার", "রাতের খাবার", "সকালের নাস্তা", "বিরিয়ানি", "কাচ্চি", "তেহারি",
        "মিষ্টি", "ফুচকা", "সিঙ্গারা", "রেস্টুরেন্ট", "কফি"
    ],
    "Groceries": [
        "groceries", "supermarket", "vegetables", "fruits", "rice", "lentils", "cooking oil", "soybean oil", "milk",
        "eggs", "fish", "meat", "chicken", "beef", "onion", "potato", "garlic", "ginger", "spices", "salt", "sugar",
        "flour", "bread", "butter", "shwapno", "agora", "meena bazar", "chaldal",
        "bazar", "bajar", "kacha bazar", "sobji", "shobji", "torkari", "mach", "maach", "mangsho", "murgi",
        "gorur mangsho", "dim", "chal", "chaal", "dal", "daal", "tel", "alu", "aloo", "piyaj", "peyaj", "roshun",
        "ada", "lobon", "chini", "morich", "doodh", "dudh", "atta", "moida",
        "বাজার", "কাঁচা বাজার", "সবজি", "তরকারি", "মাছ", "মাংস", "মুরগি", "গরুর মাংস", "ডিম", "চাল", "ডাল",
        "তেল", "আলু", "পেঁয়াজ", "রসুন", "আদা", "লবণ", "চিনি", "মরিচ", "দুধ", "আটা", "ময়দা", "ফল"
    ],
    "Transport": [
        "bus", "taxi", "uber", "pathao", "obhai", "cng", "rickshaw", "auto rickshaw", "metro rail", "train", "launch",
        "ferry", "fuel", "petrol", "octane", "diesel", "parking", "toll", "bus ticket", "train ticket", "air ticket",
        "vara", "bhara", "gari vara", "gari bhara", "bus vara", "rickshaw vara", "cng vara", "tempo", "leguna",
        "gari tel",
        "ভাড়া", "বাস ভাড়া", "রিকশা ভাড়া", "গাড়ি ভাড়া", "সিএনজি", "রিকশা", "বাস", "ট্রেন", "মেট্রো", "লঞ্চ",
        "পেট্রোল", "অকটেন", "টোল", "পার্কিং"
    ],
    "Bills & Utilities": [
        "electricity bill", "current bill", "gas bill", "water bill", "internet bill", "wifi", "broadband",
        "mobile recharge", "flexiload", "phone bill", "house rent", "rent", "service charge", "maintenance fee",
        "desco", "dpdc", "titas gas", "dish bill", "cable tv bill", "garbage bill",
        "bari bhara", "bari vara", "basha bhara", "basa vara", "biddut bill", "pani bill", "net bill", "recharge",
        "flexi", "internet pack", "mb kinlam",
        "বাড়ি ভাড়া", "বাসা ভাড়া", "বিদ্যুৎ বিল", "কারেন্ট বিল", "গ্যাস বিল", "পানির বিল", "ইন্টারনেট বিল",
        "ওয়াইফাই বিল", "মোবাইল রিচার্জ", "ফ্লেক্সিলোড", "ডিশ বিল"
    ],
    "Shopping": [
        "clothes", "shirt", "pants", "shoes", "sandals", "bag", "watch", "smartphone", "laptop", "headphones",
        "charger", "electronics", "daraz", "amazon", "cosmetics", "perfume", "gift", "furniture", "kitchenware",
        "saree", "panjabi",
        "jama", "kapor", "juta", "sari", "lungi", "ghori", "mobile kinlam", "gift kinlam", "notun jama",
        "জামা", "কাপড়", "জুতা", "শাড়ি", "লুঙ্গি", "পাঞ্জাবি", "ঘড়ি", "ব্যাগ", "উপহার", "মোবাইল ফোন"
    ],
    "Healthcare": [
        "doctor", "doctor fee", "hospital", "clinic", "pharmacy", "medicine", "tablets", "napa", "paracetamol",
        "seclo", "antibiotic", "vitamins", "diagnostic", "blood test", "x-ray", "dentist", "eye checkup", "glasses",
        "osudh", "oshudh", "oushodh", "daktar", "daktar fee", "doctor dekhalam", "hospital bill", "test korlam",
        "ওষুধ", "ডাক্তার", "ডাক্তার ফি", "হাসপাতাল", "ক্লিনিক", "ফার্মেসি", "টেস্ট", "চিকিৎসা", "দাঁতের ডাক্তার",
        "চশমা"
    ],
    "Entertainment": [
        "movie", "cinema", "movie ticket", "netflix", "spotify", "youtube premium", "hoichoi", "chorki", "games",
        "game top up", "concert", "outing", "picnic", "party", "amusement park", "zoo",
        "cinema dekhlam", "ghurte gelam", "ghuraghuri", "adda", "party dilam",
        "সিনেমা", "মুভি", "পিকনিক", "ঘোরাঘুরি", "পার্টি", "গেম"
    ],
    "Education": [
        "tuition", "tuition fee", "school fee", "college fee", "university fee", "admission fee", "exam fee",
        "books", "notebook", "pen", "stationery", "course", "online course", "coaching", "private teacher",
        "boi", "khata", "kolom", "coaching fee", "porashona", "tuition dilam",
        "টিউশন", "টিউশন ফি", "স্কুল ফি", "কলেজ ফি", "ভর্তি ফি", "পরীক্ষার ফি", "বই", "খাতা", "কলম", "কোচিং"
    ],
    "Personal Care": [
        "haircut", "salon", "parlour", "barber", "shaving", "spa", "gym", "gym fee", "fitness", "shampoo", "soap",
        "toothpaste", "skincare", "facial", "laundry", "dry cleaning",
        "chul kata", "chul katalam", "napit", "parlar", "sabun",
        "চুল কাটা", "সেলুন", "পার্লার", "জিম", "সাবান", "শ্যাম্পু", "টুথপেস্ট", "লন্ড্রি"
    ],
    "Salary": [
        "salary", "monthly salary", "wages", "bonus", "festival bonus", "freelance payment", "client payment",
        "commission", "overtime", "allowance", "pocket money", "cashback", "refund", "interest", "profit", "dividend",
        "beton", "beton pelam", "bonus pelam", "taka pelam", "client pay korse", "income",
        "বেতন", "বোনাস", "মজুরি", "আয়", "টাকা পেলাম", "ক্যাশব্যাক", "ফ্রিল্যান্সিং আয়"
    ]
};

// All categories strictly tuned to land in 250-380 entries range
const ADDITIONS: Record<string, string[]> = {
    "Food & Dining": [
        "fried chicken", "crispy chicken", "broast", "chicken broast", "chicken nuggets", "chicken wings",
        "beef burger", "chicken burger", "cheese burger", "smash burger",
        "sandwich", "club sandwich", "chicken sandwich", "sub sandwich",
        "wrap", "chicken wrap", "beef wrap", "chicken roll", "beef roll", "egg roll", "kati roll", "kathi roll", "tikka roll", "paratha roll",
        "beef tehari", "khashir tehari", "mutton tehari", "beef kacchi", "mutton biryani", "chicken biryani", "morog polao",
        "chicken polao", "shahi polao", "polao roast", "chicken roast", "beef rezala", "khashir rezala", "duck roast",
        "hasher mangsho vuna", "beef vuna", "chicken vuna", "mach vuna", "macher jhol", "shutki vuna", "gorur noli",
        "porota", "paratha", "luchi", "alur dom", "dal puri", "dalpuri", "moglai", "mughlai paratha",
        "nun ruti", "naan ruti", "butter naan", "garlic naan", "tandoori ruti", "shobji porota", "dim porota",
        "dim toast", "french toast", "omelette", "poached egg", "halwa",
        "chitoi pitha", "vapa pitha", "bhapa pitha",
        "grill chicken", "chicken grill", "tandoori chicken", "chicken tikka", "beef tikka", "boti kabab", "seekh kabab",
        "reshmi kabab", "shami kabab", "jali kabab", "chaap", "chicken chaap", "beef chaap", "luchi chaap",
        "khasi chaap", "kebab platter",
        "slice pizza", "cheese pizza", "pepperoni pizza", "bbq pizza", "baked pasta", "oven baked pasta", "lasagna",
        "chowmein", "chicken chowmein", "hakka noodles", "ramen", "wonton", "wonton soup", "momo",
        "chicken momo", "steamed momo", "fried momo", "dumpling",
        "velpuri", "bhelpuri", "ghugni", "chola boot", "chanachur makha", "badam vaja",
        "kaju badam", "alur chop", "dimer chop", "piyaju", "peyaju", "beguni", "kolija shingara", "beef shingara",
        "chicken samosa", "beef samosa", "spring roll",
        "roshogolla", "rasgulla", "gulab jamun", "kalojam", "roshomalai", "rasmalai", "chomchom", "laddu",
        "sandesh", "kacha golla", "misti doi", "bogurar doi", "tok doi", "faluda", "kulfi", "rabri",
        "shemai", "dudh shemai", "lachha shemai", "payesh", "firni", "jilapi", "shahi jilapi",
        "chocolate pastry", "black forest", "cheesecake", "brownie", "donut",
        "waffle", "pancake", "pudding", "caramel pudding",
        "dudh cha", "lebu cha", "rong cha", "raw tea", "malai cha", "masala cha", "ginger tea", "adar cha", "tandoori cha",
        "green tea", "black tea", "lemon tea", "milk tea", "matka cha",
        "iced coffee", "latte", "cappuccino", "espresso", "americano", "mocha", "frappe", "hot chocolate",
        "sweet lassi", "mango lassi", "borhani", "bhorhani", "matha", "rooh afza", "aakher rosh", "sugarcane juice",
        "lebur shorbot", "lemon juice", "daab", "daaber pani", "coconut water", "beler shorbot", "mango juice", "orange juice",
        "papaya juice", "strawberry shake", "chocolate shake", "milkshake",
        "coke", "coca cola", "pepsi", "7up", "sprite", "fanta", "mirinda", "mojo", "speed",
        "kacchi bhai", "sultan's dine", "grand nawab", "salam's kitchen", "star kabab", "madchef", "chillox", "takeout", "bfc",
        "dominos", "north end", "gloria jeans", "tasty treat", "mithai", "coopers",
        "dupurer lunch", "dupure khelam", "dinner korlam", "nasta korlam", "cha nasta", "office nasta", "dupurer meal",
        "office tiffin", "canteen khabar", "hotel bill", "restaurant bill", "foodpanda order", "pathao food",
        "dawat khelam", "buffet dinner", "party dilam", "sehri khelam", "cha khilam",
        "কাচ্চি ভাই", "সুলতানস ডাইন", "স্টার কাবাব", "আল রাজ্জাক", "বিসমিল্লাহ কাবাব", "চিলক্স", "টেকআউট", "বিএফসি",
        "ডমিনোজ", "নর্থ এন্ড", "টেস্টি ট্রিট", "মিঠাই", "কুপার্স",
        "ফ্রাইড চিকেন", "ক্রিস্পি চিকেন", "চিকেন নাগেটস", "চিকেন রোল", "এগ রোল", "কাঠি রোল", "চিকেন র্যাপ",
        "ক্লাব স্যান্ডউইচ", "সাব স্যান্ডউইচ", "পিজ্জা স্লাইস", "ওভেন বেকড পাস্তা", "চিকেন চাউমিন", "মোমো", "চিকেন মোমো",
        "নান রুটি", "বাটার নান", "পরোটা", "মোগলাই পরোটা", "আলুর দম", "ডিম পরোটা", "লুচি", "চিতই পিঠা", "ভাপা পিঠা",
        "গ্রিল চিকেন", "তন্দুরি চিকেন", "চিকেন টিক্কা", "শিক কাবাব", "বটি কাবাব", "জালি কাবাব", "চিকেন চাপ", "বিফ চাপ",
        "হালিম", "নিহারি", "বোরহানি", "লাচ্ছি", "মাঠা",
        "ভেলপুরি", "ঘুগনি", "ছোলা বুট", "বাদাম ভাজা", "চানাচুর মাখা", "আলুর চপ", "ডিমের চপ", "পেঁয়াজু", "বেগুনি", "ডালপুরি",
        "কলিজা সিঙ্গারা", "চিকেন সমুচা", "স্প্রিং রোল",
        "রসগোল্লা", "গোলাপ জামুন", "কালোজাম", "রসমালাই", "চমচম", "মতিচুর লাড্ডু", "সন্দেশ", "মিষ্টি দই", "বগুড়ার দই",
        "ফালুদা", "কুলফি মালাই", "পায়েস", "ফিরনি", "জিলাপি", "পেস্ট্রি", "চকলেট কেক", "ব্রাউনি", "ওয়াফেল", "ক্যারামেল পুডিং",
        "লেবু চা", "দুধ চা", "লাল চা", "মালাই চা", "মসলা চা", "আদা চা", "মাটকা চা", "কোল্ড কফি", "ক্যাপুচিনো", "লাতে",
        "চকলেট শেক", "ডাবের পানি", "লেবুর শরবত", "আঁখের রস", "বেলের শরবত", "ম্যাঙ্গো জুস", "মিল্কশেক",
        "পেপসি", "সেভেন আপ", "স্প্রাইট",
        "কাচ্চি খেলাম", "বিরিয়ানি খেলাম", "নাস্তা করলাম", "চা নাস্তা", "দুপুরের লাঞ্চ", "রাতের ডিনার", "অফিসের টিফিন",
        "হোটেলের বিল", "রেস্টুরেন্ট বিল", "ফুডপান্ডা অর্ডার", "পাঠাও ফুড অর্ডার", "বুফে ডিনার", "দাওয়াত খেলাম", "সেহরি খেলাম",
        "ফাস্ট ফুড খেলাম", "চিকেন চাপ খেলাম", "কাবাব খেলাম", "পিজ্জা খেলাম", "স্যান্ডউইচ খেলাম", "মোমো খেলাম", "রেস্টুরেন্টে খেলাম"
    ],

    "Groceries": [
        "shosha", "gajor", "badhakopi", "fulkopi", "phulkopi", "shim", "dherosh",
        "korola", "karela", "borboti", "misti kumra", "chal kumra",
        "jhinga", "chichinga", "dhundul", "kochu", "mukhi kochu",
        "kochu shak", "lal shak", "palong shak", "puishak", "kolmi shak", "pata kopi", "mula",
        "kacha morich", "green chili", "lebu", "dhone pata", "pudina pata",
        "kacha kola", "sajna", "motor shuti", "kacha pepe",
        "katla mach", "pangash", "pangas mach", "telapia", "tilapia", "boal mach",
        "magur mach", "shing mach", "tengra mach", "baim mach", "shoal mach", "rupchanda",
        "vetki", "kachki", "mola mach", "pabda mach", "ayre mach",
        "shutki", "loitta shutki",
        "khasi", "khasir mangsho", "mutton", "deshi murgi", "broiler murgi",
        "beef kolija", "mutton kolija", "hasher mangsho", "hasher dim",
        "keema", "beef keema", "chicken keema", "beef bones", "deshi murgir dim", "dim kinlam",
        "miniket chal", "najirshail", "najirshail chal", "katari bhog", "bashmoti chal", "chinigura chal",
        "lal chal", "brown rice", "mug dal", "moong dal", "cholar dal",
        "mashkalai", "khesari dal", "boot dal", "chola",
        "holud", "turmeric", "morich gura", "dhonia gura", "jeera", "gorom moshla",
        "elaichi", "cardamom", "daruchini", "lobongo", "tejpata", "bay leaf",
        "golmorich", "black pepper", "methi", "kalo jeera", "mustard seeds", "shorshe",
        "biryani moshla", "soy sauce", "vinegar", "mayonnaise",
        "mustard oil", "shorsher tel", "sunflower oil", "olive oil", "rice bran oil", "teer oil",
        "rupchanda oil", "ghee", "milk vita ghee", "dalda",
        "liquid milk", "milk vita", "pran milk", "condensed milk", "powder milk",
        "nido", "cheese", "paneer", "curd", "pau ruti", "oats", "quaker oats", "suji", "sewai",
        "chira", "muri", "puffed rice", "gur", "jaggery",
        "aam", "mango", "amropali", "kola", "banana", "kathal", "lichu",
        "peyara", "komola", "malta", "anar", "dalim",
        "anaros", "angur", "grapes", "tarbuz", "bangi",
        "pepe", "boroi", "jam", "apel", "apple", "dragon fruit", "dates", "khejur",
        "wheel soap", "surf excel", "detergent", "dishwash bar", "vim bar",
        "harpic", "toilet cleaner", "floor cleaner", "odonil",
        "mosquito coil", "aerosol", "tissue paper", "toilet paper",
        "garbage bag", "match box", "gas lighter", "scotch brite", "broom", "jharu",
        "unimart", "daily shopping", "prince bazar", "chaldal order", "swapno bazar",
        "kacha bazar korlam", "shobji kinlam", "mach kinlam", "mangsho kinlam", "mash kabari bazar", "bazar khoroch",
        "grocery shopping", "shobji bazar", "torkari kinlam", "doodh kinlam",
        "শসা", "গাজর", "বাঁধাকপি", "ফুলকপি", "শিম", "ঢ্যাঁড়শ", "করলা", "বরবটি", "মিষ্টি কুমড়া", "চাল কুমড়া",
        "ঝিঙে", "চিচিঙ্গা", "ধুন্দুল", "কচু", "কচুর লতি", "লাল শাক", "পালং শাক", "পুঁই শাক", "কলমি শাক", "মুলা",
        "কাঁচা মরিচ", "লেবু", "ধনেপাতা", "পুদিনা পাতা", "কাঁচকলা", "মটরশুঁটি", "ক্যাপসিকাম", "ব্রোকলি", "কাঁচা পেঁপে",
        "কাতলা মাছ", "পাঙ্গাশ মাছ", "তেলাপিয়া মাছ", "বোয়াল মাছ", "কৈ মাছ", "মাগুর মাছ", "শিং মাছ", "টেংরা মাছ", "বাইম মাছ",
        "চিতল মাছ", "রূপচাঁদা মাছ", "ভেটকি মাছ", "কাচকি মাছ", "পাবদা মাছ", "আইড় মাছ",
        "লইট্টা শুঁটকি", "চেপা শুঁটকি", "দেশি মাছ", "নদীর মাছ", "শুঁটকি মাছ", "তাজা মাছ",
        "খাসির মাংস", "দেশি মুরগি", "ব্রয়লার মুরগি", "সোনালী মুরগি", "হাঁসের মাংস", "হাঁসের ডিম", "গরুর কলিজা", "চিকেন কিমা", "বিফ কিমা",
        "ডিম কিনলাম", "দেশি ডিম", "ফার্মের ডিম", "ডিমের হালি", "এক হালি ডিম",
        "মিনিকেট চাল", "নাজিরশাইল চাল", "কাটারিভোগ চাল", "বাসমতী চাল", "চিনিগুঁড়া চাল", "পোলাও চাল", "লাল চাল",
        "মুগ ডাল", "ছোলার ডাল", "মাষকলাই ডাল", "খেসারি ডাল", "বুটের ডাল", "ছোলা",
        "হলুদ", "হলুদের গুঁড়া", "মরিচের গুঁড়া", "ধনিয়া গুঁড়া", "জিরা", "জিরার গুঁড়া", "গরম মসলা", "এলাচ", "দারুচিনি",
        "লবঙ্গ", "তেজপাতা", "গোলমরিচ", "মেথি", "কালোজিরা", "সরিষা", "বিরিয়ানি মসলা", "সয়া সস", "ভিনেগার",
        "সয়াবিন তেল", "সরিষার তেল", "সানফ্লাওয়ার তেল", "অলিভ অয়েল", "রূপচাঁদা তেল", "তীর তেল", "ফ্রেশ তেল", "খাঁটি ঘি",
        "তরল দুধ", "মিল্ক ভিটা দুধ", "গুঁড়া দুধ", "নিডো", "মাখন", "পনির", "পাউরুটি", "টোস্ট", "ওটস", "সুজি", "সেমাই", "চিড়া", "মুড়ি", "খেজুরের গুড়",
        "আম", "হিমসাগর", "ল্যাংড়া আম", "কলা", "সবরি কলা", "সাগর কলা", "কাঁঠাল", "লিচু", "পেয়ারা", "কমলা", "মাল্টা", "ডালিম", "আনারস", "আঙুর", "তরমুজ", "পেঁপে", "বরই", "খেজুর", "আপেল",
        "ডিটারজেন্ট", "সার্ফ এক্সেল", "রিন পাউডার", "ভিম বার", "ভিম লিকুইড", "হারপিক", "টয়লেট ক্লিনার", "ফ্লোর ক্লিনার", "লাইজল", "মশার কয়েল", "অ্যারোসল", "টিস্যু পেপার", "টয়লেট পেপার", "ডাস্টবিন ব্যাগ", "ঝাড়ু",
        "ইউনিমার্ট", "ডেইলি শপিং", "প্রিন্স বাজার", "চালডাল অর্ডার", "স্বপ্ন সুপারশপ", "কাঁচা বাজার করলাম", "সবজি কিনলাম", "মাছ কিনলাম", "মাংস কিনলাম", "মাসিক বাজার", "বাজার খরচ", "তেল কিনলাম", "চাল কিনলাম"
    ],

    "Transport": [
        "local bus", "direct bus", "sitting service", "bus bhara", "half pass", "student vara", "ticket katlam", "counter ticket",
        "metro card", "mrt pass", "mrt pass recharge", "metro rail ticket", "rapid pass", "cng bhara", "cng meter",
        "battary auto", "tomtom", "easy bike", "laguna", "laguna bhara", "laguna vara", "tempo", "tempo vara",
        "rickshaw bhara", "rickshawala", "van vara", "ghorar gari",
        "uber car", "uber premier", "uber xl", "uber trip", "uber moto", "pathao car", "pathao ride", "obhai car",
        "shohoz ride", "jatri", "car pool", "car rent", "rent a car", "private car", "driver salary", "driver er beton",
        "driver kharach", "chauffer", "hire car", "scooter ride", "scooter bhara", "ride share", "ride sharing",
        "rideshare app", "cab booking", "online cab", "moto ride", "bike booking",
        "train ticket", "shobhon chair", "snigdha", "ac chair", "ac berth", "shohoz train ticket", "railway ticket",
        "station counter", "launch cabin", "launch deck", "launch ticket", "green line", "soudia", "shohagh", "hanif",
        "ena", "shyamoli", "saintmartin paribahan", "deshtravels", "ac bus", "non-ac bus", "sleeper coach",
        "steamer", "ferry ticket", "aricha ghat", "shimulia ghat", "ferry parapar", "speed boat", "trawler", "nouka",
        "boat", "nouka parapar", "ghat vara", "river cruise",
        "flight", "flight ticket", "domestic flight", "international flight", "airfare", "plane ticket", "biman bangladesh",
        "us-bangla airlines", "novoair", "air astra", "emirates ticket", "flydubai", "saudi airlines", "airport taxi",
        "airport cab", "luggage charge", "excess baggage fee", "boarding pass",
        "cng gas", "lpg gas car", "cng pump", "petrol pump", "mobil", "engine oil", "brake oil", "gear oil",
        "car wash", "bike wash", "puncture", "tyre puncture", "chaka puncture", "hawa dilam", "tyre", "tube",
        "battery", "car battery", "bike battery", "chain lube", "servicing", "car service", "bike servicing",
        "car repair", "bike repair", "engine tuning", "wheel alignment", "brake shoe", "spark plug", "gari wash",
        "gari repair", "gari servicing", "motor parts", "bike parts", "bike fuel", "bike octane", "bike tuning",
        "padma bridge toll", "expressway toll", "mayor hanif flyover", "flyover toll", "toll plaza", "toll dilam",
        "bridge toll", "ghat toll", "parking fee", "car parking", "garage rent", "garage bhara", "brta", "brta fee",
        "driving license fee", "fitness certificate", "road tax", "tax token", "route permit", "car insurance",
        "traffic fine", "traffic case", "gari kagoj", "license renew", "cng te office", "bus e gelam", "rickshaw nilam",
        "লোকাল বাস", "ডিরেক্ট বাস", "সিটি বাস", "সিটিং বাস", "বাস ভাড়া", "হাফ পাস", "মেট্রো কার্ড", "এমআরটি পাস রিচার্জ",
        "মেট্রো রেল টিকিট", "র্যাপিড পাস", "সিএনজি ভাড়া", "সিএনজি মিটার", "ব্যাটারি অটো", "টমটম", "ইজিবাইক", "লেগুনা ভাড়া",
        "টেম্পো ভাড়া", "রিকশা ভাড়া", "ভ্যান ভাড়া",
        "উবার", "উবার কার", "উবার রাইড", "পাঠাও রাইড", "সহজ রাইড", "গাড়ি ভাড়া", "রেন্ট এ কার", "প্রাইভেট কার", "ড্রাইভারের বেতন",
        "আন্তঃনগর ট্রেন", "শোভন চেয়ার", "স্নিগ্ধা", "ট্রেনের এসি সিট", "ট্রেন টিকিট", "রেলওয়ে টিকিট", "লঞ্চের কেবিন", "লঞ্চের টিকিট",
        "গ্রিন লাইন", "হানিফ পরিবহন", "শ্যামলী পরিবহন", "এনা পরিবহন", "সোহাগ পরিবহন", "এসি বাস", "স্লিপার কোচ", "ফেরি পারাপার",
        "ফেরির টিকিট", "স্পিডবোট", "নৌকা পারাপার", "ট্রলার ভাড়া", "ঘাট ভাড়া",
        "ফ্লাইট টিকিট", "এয়ার টিকিট", "ডোমেস্টিক ফ্লাইট", "প্লেন টিকিট", "এয়ারলাইন্স টিকিট",
        "সিএনজি গ্যাস", "পেট্রোল পাম্প", "অকটেন নিলাম", "ডিজেল কিনলাম", "ইঞ্জিন অয়েল", "মবিল", "টায়ার পাংচার", "চাকা মেরামত",
        "কার ওয়াশ", "বাইক ওয়াশ", "গাড়ি মেরামত", "গাড়ি সার্ভিসিং", "বাইক সার্ভিসিং", "বাইকের মবিল", "গাড়ির পার্টস", "চাকা হাওয়া",
        "পদ্মা সেতু টোল", "এক্সপ্রেসওয়ে টোল", "ফ্লাইওভার টোল", "টোল দিলাম", "পার্কিং ফি", "গ্যারেজ ভাড়া", "বিআরটিএ ফি",
        "ড্রাইভিং লাইসেন্স ফি", "রোড ট্যাক্স", "ট্যাক্স টোকেন", "ট্রাফিক জরিমানা", "লাইসেন্স নবায়ন", "বাসে গেলাম", "রিকশায় গেলাম"
    ],

    "Bills & Utilities": [
        "desco bill", "dpdc bill", "nesco", "nesco bill", "reb", "reb bill", "palli bidyut", "palli biddut bill",
        "wzkpdc", "electricity bill dilam", "electric meter recharge", "prepaid card recharge", "electric bill", "bijli bill",
        "sub station charge", "transformer fee", "electric token recharge", "current er bill", "biddut bill dilam",
        "polli biddut bill", "meter token", "palli biddut bill dilam",
        "titas", "titas gas bill", "bakhrabad gas", "jalalabad gas", "karnaphuli gas", "lpg gas", "lp gas",
        "gas cylinder", "omera lpg", "basundhara gas", "bm gas", "jamuna gas", "cylinder gas", "gas kinlam", "gas bill dilam",
        "titas gas bill dilam",
        "wasa", "dhaka wasa", "chittagong wasa", "wasa water bill", "wasa bill", "water pump bill", "deep tubewell fee",
        "jar water", "jar er pani", "drinking water jar", "filter pani", "pani kinlam", "wasa bill dilam",
        "link3", "dot internet", "amberit", "carnival internet", "circle network", "ks network", "icc communication",
        "fiber optic bill", "optical fiber fee", "isp bill", "wifi bill", "wifi connection fee", "internet charge",
        "wifi recharge", "dish line", "dish bill", "akash dth", "akash recharge", "dth bill", "set top box recharge", "cable operator fee",
        "wifi bill dilam", "net bill dilam", "internet bill dilam", "dish er bill", "akash dth bill",
        "grameenphone recharge", "grameenphone pack", "banglalink", "banglalink recharge", "bl recharge",
        "airtel", "airtel recharge", "teletalk", "teletalk recharge", "skitto", "skitto balance",
        "minute pack", "data pack", "internet offer", "call rate", "post paid bill", "postpaid bill", "mobile balance",
        "minute kinlam", "talktime recharge", "recharge korlam", "grameenphone flexiload", "banglalink flexiload",
        "airtel flexiload", "teletalk flexiload", "skitto recharge korlam", "data pack kinlam", "minute pack kinlam",
        "call rate pack", "postpaid bill payment",
        "flat rent", "basha vara", "bari bhara dilam", "bachelor basha vara", "hostel fee", "mess fee", "mess bill",
        "meal charge", "service charge", "building maintenance", "lift bill", "generator bill", "security guard fee",
        "darowan er beton", "cleaner fee", "shomiti fee", "community fee", "flat maintenance", "khoroch er hisab",
        "garbage bill", "moylar bill", "security guard bill", "basha bhara advance", "flat service charge",
        "building security fee", "apartment maintenance", "generator diesel bill", "community police fee",
        "cctv maintenance", "garbage collection fee", "basha change advance",
        "bkash cash out fee", "bkash charge", "nagad cash out fee", "nagad charge", "rocket fee", "upay charge",
        "atm withdrawal fee", "bank charge", "card annual fee", "account maintenance fee", "sms alert fee", "cheque book fee",
        "locker charge", "debit card fee", "bank fee", "bkash send money fee", "bkash transfer charge", "nagad cashout fee",
        "rocket cashout charge", "atm card fee", "sms charge", "bank service charge",
        "ডেসকো বিল", "ডিপিডিসি বিল", "নেসকো বিল", "পল্লী বিদ্যুৎ বিল", "বিদ্যুৎ বিল দিলাম", "ইলেকট্রিক বিল",
        "প্রিপেইড কার্ড রিচার্জ", "বিদ্যুৎ মিটার রিচার্জ", "মিটার রিচার্জ", "কারেন্ট বিল দিলাম", "পল্লী বিদ্যুৎ",
        "তিতাস গ্যাস", "বাখরাবাদ গ্যাস", "এলপিজি সিলিন্ডার", "গ্যাসের সিলিন্ডার", "ওমেরা গ্যাস", "বসুন্ধরা গ্যাস",
        "ওয়াসা বিল", "ঢাকা ওয়াসা বিল", "পানির জার", "ফিল্টার পানি", "পানির খরচ", "গ্যাস বিল দিলাম",
        "লিঙ্কথ্রি", "ডট ইন্টারনেট", "কার্নিভাল ইন্টারনেট", "ওয়াইফাই বিল দিলাম", "অপটিক্যাল ফাইবার বিল", "ইন্টারনেট চার্জ",
        "ডিশ লাইন বিল", "আকাশ ডিটিএইচ রিচার্জ", "কেবল টিভি বিল", "নেট বিল দিলাম",
        "গ্রামীণফোন রিচার্জ", "বাংলালিংক রিচার্জ", "এয়ারটেল রিচার্জ", "টেলিটক রিচার্জ", "স্কিটো ব্যালেন্স",
        "মিনিট প্যাক", "ডেটা প্যাক", "পোস্টপেইড বিল", "টকটাইম রিচার্জ", "মোবাইল ব্যালেন্স",
        "ফ্ল্যাট ভাড়া", "ব্যাচেলর মেস ভাড়া", "মেস ফি", "মেস বিল", "মিল চার্জ", "বিল্ডিং মেইনটেন্যান্স",
        "ভবন রক্ষণাবেক্ষণ", "লিফট বিল", "জেনারেটর বিল", "দারোয়ানের বেতন", "ময়লার বিল", "সোসাইটি চাঁদা",
        "বাসা ভাড়া বাবদ", "বাড়ি ভাড়া বাবদ", "মেস খরচ", "সার্ভিস চার্জ দিলাম",
        "বিকাশ চার্জ", "নগদ ক্যাশ আউট ফি", "রকেট চার্জ", "এটিএম চার্জ", "ব্যাংক চার্জ", "কার্ড বাৎসরিক ফি", "এসএমএস চার্জ", "চেক বই ফি"
    ],

    "Shopping": [
        "polo shirt", "casual shirt", "formal shirt", "jeans", "denim pants", "gabardine pants", "trousers", "chinos",
        "formal pant", "payjama", "panjabi", "fotua", "kurta", "jamdani", "katan", "georgette sari", "silk saree",
        "salwar kameez", "three piece", "3 piece", "kurti", "tops", "leggings", "orna", "dupatta", "burqa",
        "abaya", "hijab", "borka", "borkha", "innerwear", "undergarments", "bra", "panty", "jersey", "hoodie",
        "sweatshirt", "sweater", "jacket", "blazer", "suit", "raincoat", "umbrella", "chata", "gamcha", "lungi",
        "leather shoes", "formal shoes", "loafers", "casual shoes", "boots", "running shoes", "sports shoes", "keds",
        "slippers", "flip flops", "slip on", "high heels", "flats", "choti juta", "sandal", "apex", "bata",
        "lotto", "bay emporium", "step", "zeil's", "pegasus", "leather sandals",
        "backpack", "school bag", "college bag", "laptop bag", "side bag", "sling bag", "travel bag", "trolley bag",
        "luggage", "suitcase", "wallet", "leather wallet", "purse", "ladies vanity bag", "belt", "leather belt",
        "cap", "hat", "tie", "cufflink", "socks", "gloves", "sunglasses", "shades", "reading glasses", "spectacles",
        "choshma frame", "stylish frame", "wristwatch", "wrist watch", "smart watch", "apple watch", "casio watch",
        "smartphone", "mobile phone", "android phone", "iphone", "samsung phone", "xiaomi", "redmi", "realme", "vivo",
        "oppo", "oneplus", "ipad", "tablet", "dell laptop", "hp laptop", "macbook", "monitor", "keyboard", "mouse",
        "mechanical keyboard", "wireless mouse", "mousepad", "pendrive", "usb drive", "external hard drive", "ssd",
        "micro sd card", "otg adapter", "fast charger", "mobile adapter", "phone charger", "type c cable", "lightning cable",
        "extension cord", "multipeer", "multiplug", "led bulb", "table lamp", "torch light", "bluetooth speaker",
        "soundbar", "smart tv", "air conditioner", "ac kinlam", "refrigerator", "fridge", "washing machine", "microwave oven",
        "ceiling fan", "stand fan", "iron", "geyser", "room heater", "screen protector", "tempered glass", "phone cover",
        "bedsheet", "bed cover", "pillow", "pillow cover", "blanket", "kombol", "quilt", "lep", "toshok",
        "mattress", "curtains", "porda", "door mat", "carpet", "rug", "frying pan", "non-stick pan", "pressure cooker",
        "rice cooker", "blender", "mixer grinder", "electric kettle", "induction cooker", "water filter", "water bottle",
        "tiffin box", "plate", "glass", "cup set", "mug", "dinner set", "spoon", "fork", "knife", "boti",
        "bucket", "balti", "dustbin", "plastic rack", "rfl rack", "storage box", "clothes hanger",
        "daraz parcel", "pikabu", "othoba", "ajkerdeal", "yellow", "sailor", "cats eye", "richman", "infinity",
        "artisan", "le reve", "gentle park", "lubnan", "kay kraft", "anjan's", "taaga", "bata showroom", "apex showroom",
        "bashundhara city", "jamuna future park", "new market", "banga bazar", "hawkers market", "shopping mall",
        "brand showroom", "notun dress", "puja shopping", "winter shopping", "dress kinlam", "shomoy shoping",
        "kapor kinlam", "juta kinlam", "pant kinlam", "shirt kinlam", "lifestyle store", "boutique shop",
        "portable battery", "mobile accessories", "back cover", "mobile pouch", "laptop stand", "bluetooth mouse",
        "laptop charger", "otg cable", "sd card reader", "fast charging adapter", "usb charger",
        "শার্ট", "পলো শার্ট", "জিন্স প্যান্ট", "ট্রাউজার", "পায়জামা", "পাঞ্জাবি", "ফতুয়া", "কুর্তি", "থ্রি পিস",
        "সালোয়ার কামিজ", "ওড়না", "বোরকা", "হিজাব", "জামদানি শাড়ি", "সুতি শাড়ি", "কাতান শাড়ি", "সিল্ক শাড়ি",
        "লুঙ্গি", "গামছা", "সোয়েটার", "জ্যাকেট", "ব্লেজার", "ছাতা", "রেইনকোট", "নতুন জামা",
        "চামড়ার জুতা", "ফরমাল জুতা", "লোফার", "স্পোর্টস শু", "কেডস", "স্যান্ডেল", "স্লিপার", "বাটা জুতা", "এপেক্স জুতা", "চামড়ার স্যান্ডেল",
        "ব্যাকপ্যাক", "ট্রাভেল ব্যাগ", "ট্রলি ব্যাগ", "লাগেজ", "চামড়ার মানিব্যাগ", "পার্স", "ভ্যানিটি ব্যাগ", "চামড়ার বেল্ট",
        "টুপি", "মোজা", "হাতঘড়ি", "স্মার্টওয়াচ", "রোদের চশমা", "চশমার ফ্রেম",
        "স্মার্টফোন", "আইফোন", "ট্যাবলেট", "ল্যাপটপ", "মনিটর", "কিবোর্ড", "মাউস", "পেনড্রাইভ", "চার্জার", "ফাস্ট চার্জার",
        "টাইপ সি কেবল", "মাল্টিপ্লাগ", "এলইডি বাল্ব", "টেবিল ল্যাম্প", "ব্লুটুথ স্পিকার", "স্মার্ট টিভি", "এসি কিনলাম",
        "ফ্রিজ কিনলাম", "ওয়াশিং মেশিন", "সিলিং ফ্যান",
        "বেডশিট", "বিছানার কভার", "বালিশ", "বালিশের কভার", "কম্বল", "লেপ", "তোশক", "তোয়ালে", "পর্দা", "পাপোশ",
        "ফ্রাইপ্যান", "প্রেসার কুকার", "রাইস কুকার", "ব্লেন্ডার", "ইলেকট্রিক কেটলি", "ওয়াটার ফিল্টার", "প্লেট", "গ্লাস",
        "কাপ সেট", "থালাবাসন", "বালতি", "মগ", "প্লাস্টিক রেক", "ডিনার সেট",
        "দারাজ", "পিকাবু", "বসুন্ধরা সিটি", "যমুনা ফিউচার পার্ক", "নিউ মার্কেট", "বঙ্গবাজার", "শপিং করলাম",
        "নতুন পোশাক", "পূজা শপিং", "শীতের পোশাক", "জামাকাপড় কিনলাম", "জুতা কিনলাম"
    ],

    "Healthcare": [
        "napa extra", "napa extend", "napa rapid", "ace", "ace extra", "fast", "pyrex", "fever medicine", "paracetamol tablet",
        "gastric medicine", "gastric capsule", "gastric tablet", "antacid", "antacid plus",
        "pantodac", "finix", "losectil", "pantonix", "exium",
        "fexo", "alatrex", "ebatin", "bilastin", "antihistamine", "monas", "montene", "romilast",
        "asthma inhaler", "salbutamol", "ventolin inhaler", "seretide", "inhaler refill",
        "azithromycin", "ciprofloxacin", "cefixime", "amoxicillin", "zithrox", "ciprocin", "antibiotic course",
        "orsaline", "smc orsaline", "saline", "electrolyte", "iv saline", "vitamin c", "ceevit", "bexitra",
        "b-50", "neuro-b", "neurobion", "calcium tablet", "calbo d", "ostocal d", "zinc tablet", "iron syrup",
        "tufnil", "migrain tablet", "sleeping pill", "calm", "lexotanil", "pain killer", "flamyd", "voveran",
        "diclofenac", "burn cream", "burnsil", "savlon", "dettol", "bandage", "band-aid", "surgical tape",
        "cotton", "gauge", "betadine", "povidone iodine", "nebualizer", "nebulizer solution",
        "diabetes medicine", "metformin", "diabetes tablet", "glucose strips", "sugar test strips", "thyroid medicine",
        "thyrox", "bp medicine", "amlodipine", "losartan", "atenolol", "cholesterol medicine", "atorvastatin",
        "eye ointment", "ear drop", "nasal spray", "otrivin", "cough syrup", "tusca", "adovas", "jhandu balm",
        "tiger balm", "vicks", "moov spray", "pain balm", "medicine kinlam", "injection", "syringe", "diabetic supplies",
        "blood glucose control", "needle", "diabetic care",
        "mbbs doctor", "specialist doctor", "medicine specialist", "cardiologist", "heart doctor", "neurologist",
        "gynecologist", "obstetrician", "pediatrician", "baby doctor", "dermatologist", "skin specialist",
        "orthopedics", "bone doctor", "psychiatrist", "mental health counselor", "ent specialist", "throat doctor",
        "urologist", "nephrologist", "kidney specialist", "oncologist", "surgeon", "doctor fee dilam",
        "doctor appointment", "chamber fee", "consultation fee", "second opinion", "dentist appointment",
        "tooth extraction", "root canal", "teeth scaling", "braces", "teeth cleaning", "daktar dekhanor fee", "prescription fee",
        "square hospital", "evercare hospital", "united hospital", "labaid", "ibn sina", "popular diagnostic",
        "delta hospital", "birdem", "bssmu", "pg hospital", "dhaka medical", "dmch", "suhrawardy hospital",
        "national heart institute", "icddrb", "emergency ward", "icu charge", "cabin charge", "bed charge",
        "admission charge", "discharge bill", "operation bill", "surgery fee", "ambulance", "ambulance vara", "clinic bill",
        "cbc", "hemoglobin test", "urine test", "stool test", "lipid profile", "liver function test", "sgot",
        "sgpt", "serum creatinine", "kidney function test", "thyroid test", "tsh", "fasting glucose", "hba1c test",
        "diabetes test", "dengue test", "dengue ns1", "malaria test", "typhoid test", "widal test", "covid test",
        "rt-pcr", "chest x-ray", "ecg", "echo", "echocardiogram", "ultrasonography", "usg", "mri", "ct scan",
        "endoscopy", "colonoscopy", "biopsy", "pathology test", "lab test", "diagnosis report",
        "physiotherapy", "physio session", "speech therapy", "optical shop", "power glasses", "spectacle lens",
        "contact lens", "frame change", "hearing aid", "bp machine", "blood pressure monitor", "glucometer",
        "digital thermometer", "wheelchair", "crutches", "knee cap", "lumbar belt", "cervical collar",
        "hot water bag", "ice bag", "pulse oximeter",
        "নাপা এক্সট্রা", "এসি", "প্যারাসিটামল", "সারজেল", "ম্যাক্সপ্রো", "প্যান্টোড্যাক", "গ্যাস্ট্রিকের ওষুধ",
        "এন্টাসিড", "ফেক্সো", "মনাস", "ইনহেলার", "ও স্যালাইন", "ওরস্যালাইন", "ভিটামিন সি", "ক্যালবো ডি",
        "ক্যালসিয়াম ট্যাবলেট", "কাশির সিরাপ", "ব্যথানাশক ট্যাবলেট", "স্যাভলন", "ব্যান্ডেজ", "পভিডন মলম",
        "ডায়াবেটিসের ওষুধ", "প্রেশারের ওষুধ", "নাকের ড্রপ", "চোখের মলম", "ওষুধের বিল",
        "এমবিবিএস ডাক্তার", "মেডিসিন বিশেষজ্ঞ", "হৃদরোগ বিশেষজ্ঞ", "শিশু বিশেষজ্ঞ", "চর্মরোগ বিশেষজ্ঞ", "নাক কান গলা বিশেষজ্ঞ",
        "গাইনি ডাক্তার", "কিডনি বিশেষজ্ঞ", "দাঁতের চিকিৎসক", "ডক্টরস ফি", "ডাক্তারের প্রেসক্রিপশন", "ডাক্তারের ভিজিট",
        "কনসালটেশন ফি", "চেম্বার ফি",
        "স্কয়ার হাসপাতাল", "এভারকেয়ার", "ইউনাইটেড হাসপাতাল", "ল্যাবএইড", "ইবনে সিনা", "পপুলার ডায়াগনস্টিক", "বারডেম",
        "পিজি হাসপাতাল", "ঢাকা মেডিকেল", "আইসিইউ বিল", "কেবিন ভাড়া", "অপারেশন চার্জ", "অ্যাম্বুলেন্স ভাড়া", "হাসপাতালের বিল",
        "রক্ত পরীক্ষা", "সিবিসি টেস্ট", "প্রস্রাব পরীক্ষা", "ক্রিয়েটিনিন টেস্ট", "থাইরয়েড টেস্ট", "ডেঙ্গু টেস্ট",
        "এক্স-রে", "ইসিজি", "ইকো", "আল্ট্রাসনোগ্রাম", "সিটি স্ক্যান", "এমআরআই", "ল্যাব টেস্ট", "প্যাথলজি টেস্ট",
        "ফিজিওথেরাপি", "চোখের চশমা", "চশমার লেন্স", "প্রেসার মাপার মেশিন", "গ্লুকোমিটার", "থার্মোমিটার", "ডিজিটাল স্কেল", "হুইলচেয়ার", "নি ক্যাপ", "পালস অক্সিমিটার"
    ],

    "Entertainment": [
        "star cineplex", "cineplex ticket", "blockbuster cinemas", "lion cinemas", "modhumita", "pop corn",
        "multiplex ticket", "hall ticket", "premiere show", "movie release", "imax ticket", "3d glasses cinema",
        "theater show", "stage natok", "drama ticket", "standup comedy", "comedy show ticket",
        "netflix subscription", "netflix renew", "spotify premium", "youtube premium family", "chorki subscription",
        "hoichoi renewal", "bongo bd", "toffee app", "zee5", "sonyliv", "disney plus", "amazon prime", "soundcloud go",
        "patreon", "discord nitro", "apple music", "audiobook", "audible", "crunchyroll",
        "steam game", "epic games", "playstation plus", "ps plus", "xbox game pass", "nintendo game",
        "free fire diamond top up", "pubg uc buy", "mobile legends diamonds", "valorant points", "cod points",
        "garena shells", "robux", "google play recharge code", "in game purchase", "game skin", "battle pass",
        "arcade game", "vr gaming", "board game cafe", "gaming cafe bill", "pool game", "snooker club", "billiard",
        "sports zone", "game arena", "play zone", "gaming lounge", "board games", "table tennis", "badminton court",
        "turf booking", "football turf", "fantasy kingdom ticket", "dream holiday park", "water kingdom",
        "amusement park entry", "safari park ticket", "national zoo", "mirpur zoo", "botanical garden", "eco park",
        "museum ticket", "national museum", "lalbagh fort ticket", "ahsan manzil ticket", "planetarium ticket",
        "theme park ticket", "water park ticket", "park entry fee", "adventure park", "resort entry", "zoo ticket",
        "shishu park ticket", "shishu park", "holiday park", "park ticket", "resort park", "park er ticket",
        "day trip", "weekend tour", "resort booking", "sajek tour", "sajik trip", "cox's bazar tour", "saint martin trip",
        "sylhet tour", "sreemangal resort", "bandarban tour", "rangamati trip", "kuakata tour", "tent rent", "camping",
        "boat trip", "picnic spot", "picnic contribution", "photowalk", "resort stay", "resort package", "travel tour",
        "chuti te tour", "vacation trip", "chutite ghurte gelam", "ghurte ber holam", "tour dilam", "dure ghurte gelam",
        "jaflong trip", "tanguar haor tour", "ratargul tour", "sajek valley resort", "inani beach tour", "himchori trip",
        "boga lake trek", "keokradong trip", "boat ride", "lake er nouka",
        "concert entry", "music festival", "band show", "rock fest", "open air concert", "live performance",
        "stadium ticket", "bpl ticket", "cricket match ticket", "football ticket", "live match ticket",
        "mirpur stadium ticket", "fan club", "book fair", "boi mela", "art exhibition", "photo exhibition",
        "photography gear", "camera accessories", "musical instrument", "guitar strings", "ukulele", "pool club",
        "adda bill", "get together", "friends adda", "reunion fee", "birthday party contribution", "bbq night",
        "acoustic night", "circus ticket", "baishakhi mela", "pitha mela", "folk fest", "standup comedy show",
        "theatre play", "drama show", "cineplex show", "matinee show", "night show movie",
        "স্টার সিনেপ্লেক্স", "সিনেমা টিকিট", "মুভি টিকিট", "সিনেপ্লেক্স টিকিট", "ব্লকবাস্টার সিনেমাস", "হল টিকিট", "থিয়েটার নাটক", "কমেডি শো টিকিট",
        "নেটফ্লিক্স সাবস্ক্রিপশন", "স্পটিফাই প্রিমিয়াম", "চরকি প্যাকেজ", "হৈচৈ সাবস্ক্রিপশন", "বঙ্গ বিডি", "ওটিটি সাবস্ক্রিপশন", "অ্যামাজন প্রাইম",
        "ফ্রি ফায়ার ডায়মন্ড", "পাবজি ইউসি", "স্টিম গেম", "প্লেস্টেশন প্লাস", "গুগল প্লে রিচার্জ", "গেমিং জোন", "আর্কেড গেম", "স্নুকার খেলা", "পুল গেম",
        "ফ্যান্টাসি কিংডম", "ড্রিম হলিডে পার্ক", "সাফারি পার্ক", "জাতীয় চিড়িয়াখানা", "বোটানিক্যাল গার্ডেন", "জাদুঘর টিকিট", "লালবাগ কেল্লা", "আহসান মঞ্জিল",
        "ডে ট্যুর", "রিসোর্ট বুকিং", "সাজেক ট্যুর", "কক্সবাজার ট্রিপ", "সেন্টমার্টিন ভ্রমণ", "বান্দরবান ট্যুর", "শ্রীমঙ্গল রিসোর্ট", "পিকনিক চাঁদা",
        "অবকাশ যাপন", "ট্যুর দিলাম", "ছুটিতে ঘুরতে গেলাম", "ঘুরতে বের হলাম", "বন্ধুদের সাথে ট্যুর", "ভ্রমণ করলাম",
        "মিউজিক কনসার্ট", "ব্যান্ড শো", "ক্রিকেট ম্যাচ টিকিট", "বিপিএল টিকিট", "ফুটবল ম্যাচ টিকিট", "বইমেলা ঘোরাঘুরি",
        "ফ্রেন্ডস আড্ডা", "রিইউনিয়ন ফি", "জন্মদিনের পার্টি", "আর্ট এক্সিবিশন"
    ],

    "Education": [
        "school tuition", "school monthly fee", "school admission", "session charge", "school dress material",
        "school tiffin box", "id card fee", "report card fee", "sports fee", "library fee", "laboratory fee",
        "annual fee", "milad fee", "tiffin fee", "college tuition", "college admission fee", "college form fill up",
        "hsc form fill up", "hsc registration", "jsc fee", "o level exam fee", "a level fee", "british council fee",
        "board fee", "cadet college exam", "school syllabus", "school fee dilam", "college fee dilam",
        "university tuition", "varsity admission fee", "term fee", "trimester fee", "credit fee", "retake fee",
        "supplement exam fee", "thesis fee", "project fee", "convocation fee", "certificate fee", "transcript fee",
        "hostel fee campus", "hall charge", "hall dues", "varsity canteen bill", "master degree fee", "mba tuition",
        "ph d fee", "graduation fee", "department fee", "varsity fee", "term registration", "trimester registration",
        "credit registration", "tuition installment", "exam form fill up", "admit card fee", "registration fee",
        "private tuition", "home tutor", "tutor fee", "sir er salary", "master fee", "batch fee", "coaching monthly fee",
        "udvash fee", "unmesh fee", "retina coaching", "ucc coaching", "focus coaching", "omeca", "helpline",
        "mentors fee", "saifurs fee", "spoken english course", "gre exam fee", "toefl fee", "sat registration",
        "bcs coaching fee", "bcs preliminary exam fee", "bank job coaching", "govt job prep", "bcs exam fee",
        "model test fee", "math tuition", "physics tuition", "chemistry tuition", "english coaching",
        "cadet coaching fee", "ndc admission test", "buet prep", "medical prep", "varsity prep",
        "primary teacher exam fee", "nibondhon exam fee",
        "coursera subscription", "edx course", "linkedin learning", "skillshare", "10 minute school", "bohubrihi",
        "interactive cares", "ostad course", "programming hero", "shikho app", "web development course", "python course",
        "digital marketing course", "graphic design course", "video editing course", "certified course", "coding bootcamp", "online workshop",
        "textbook", "guide book", "test paper", "question bank", "made easy", "lecture guide", "panjeree guide",
        "nilkhet book", "boi kinlam", "novel", "story book", "english book", "dictionary", "exercise book",
        "spiral notebook", "practical notebook", "ballpen", "gel pen", "fountain pen", "matador pen", "pin point pen",
        "highlighter", "marker", "pencil", "lead pencil", "eraser", "sharpener", "ruler", "geometry box",
        "scientific calculator", "casio calculator", "sticky notes", "diary", "calendar", "art paper", "color pencil",
        "poster paper", "document file", "clear bag", "stapler", "pins", "printout", "document print", "color print",
        "lamination", "thesis binding", "spiral binding", "khata kolom kinlam", "assignment print", "report binding",
        "guide boi kinlam", "note boi", "lecture sheet", "class notes", "hand notes", "paper sheet", "practical file",
        "স্কুল বেতন", "স্কুল ভর্তি ফি", "কলেজ বেতন", "কলেজ ভর্তি ফি", "সেশন চার্জ", "এইচএসসি ফর্ম ফিলাপ", "ল্যাব ফি", "লাইব্রেরি ফি", "বোর্ড পরীক্ষার ফি", "বার্ষিক ফি",
        "বিশ্ববিদ্যালয়ের টিউশন ফি", "ট্রাইমেস্টার ফি", "ক্রেডিট ফি", "রিটেক ফি", "কনভোকেশন ফি", "সনদপত্র ফি", "হল চার্জ", "এমবিএ ভর্তি ফি", "ডিপার্টমেন্ট ফি",
        "প্রাইভেট টিউশন", "গৃহশিক্ষকের বেতন", "ব্যাচ ফি", "কোচিং মাসিক বেতন", "উদ্ভাস ফি", "উন্মেষ ফি", "রেটিনা কোচিং", "সাইফুরস কোর্স", "বিসিএস কোচিং", "ব্যাংক জব প্রস্তুতি", "বিসিএস পরীক্ষার ফি",
        "টেন মিনিট স্কুল", "বহুব্রীহি কোর্স", "প্রোগ্রামিং হিরো", "শিখো অ্যাপ", "অনলাইন কোর্স ফি", "ডিজিটাল মার্কেটিং কোর্স", "ওয়েব ডেভেলপমেন্ট কোর্স", "গ্রাফিক ডিজাইন কোর্স",
        "পাঠ্যবই", "টেস্ট পেপার", "গাইড বই", "নীলক্ষেতের বই", "গল্পের বই", "ডিকশনারি", "নোটবুক", "প্র্যাকটিক্যাল খাতা", "কলম", "জেল পেন", "হাইলাইটার", "জ্যামিতি বক্স", "সায়েন্টিফিক ক্যালকুলেটর", "আর্ট পেপার", "স্ট্যাপলার", "প্রিন্ট খরচ", "থিসিস বাইন্ডিং", "লেমিনেশন", "খাতা কলম কিনলাম"
    ],

    "Personal Care": [
        "hair cut", "hair trim", "hair styling", "hair cut salon", "hair color", "hair spa", "hair rebonding",
        "hair keratin", "hair wash", "blow dry", "shave", "clean shave", "shaving cream", "shaving foam",
        "shaving razor", "gillette razor", "razor blade", "aftershave lotion", "mustache trim", "dari kata",
        "dari chata", "face facial", "gold facial", "fruit facial", "diamond facial", "face bleach",
        "threading", "eyebrow threading", "upper lip threading", "waxing", "body waxing", "manicure", "pedicure",
        "bridal makeup", "party makeup", "makeover", "beauty parlour bill", "salon bill", "gents salon",
        "bath soap", "beauty soap", "lux soap", "dove soap", "dettol soap", "lifebuoy soap", "body wash",
        "shower gel", "loofah", "sunsilk", "head and shoulders", "pantene", "tresemme", "clear shampoo",
        "hair conditioner", "hair oil", "parachute coconut oil", "olive oil hair", "mustard hair oil", "castor oil",
        "colgate", "close up", "pepsodent", "sensodyne", "toothbrush", "oral-b", "mouthwash",
        "listerine", "tongue cleaner", "ear buds", "cotton buds", "body spray", "fog body spray", "axe body spray",
        "wild stone", "nivea spray", "attar", "ittar", "fragrance", "roll on", "talcum powder", "ponds powder",
        "prickly heat powder", "sanitary napkins", "whisper", "senora", "freedom pad",
        "antiperspirant", "deo spray", "deo stick", "body mist", "perfume spray", "scent", "body perfume",
        "face cleanser", "micellar water", "face scrub", "face pack", "clay mask", "sheet mask", "toner",
        "rose water", "gulabari", "face serum", "vitamin c serum", "hyaluronic acid", "moisturizer", "nivea soft cream",
        "cold cream", "ponds cream", "fair and lovely", "glow and lovely", "tibet snow", "sunscreen", "sunblock",
        "spf cream", "lip balm", "vaseline", "petroleum jelly", "chapstick", "hand cream", "body lotion",
        "vaseline lotion", "nivea body lotion", "wet wipes", "makeup wipes", "cotton pads", "nail polish",
        "nail polish remover", "nail cutter", "tweezers",
        "gym monthly fee", "gym admission fee", "gym trainer fee", "gym subscription", "fitness club fee",
        "crossfit", "cardio", "workout session", "bodybuilding supplement", "whey protein", "creatine",
        "multivitamin fitness", "shaker bottle", "yoga class", "yoga mat", "swimming pool ticket", "swimming club fee",
        "sauna", "massage", "body massage", "spa treatment", "thai spa",
        "laundry bill", "dry cleaning", "ironing", "kapor iron", "steam iron", "clothes washing", "suit dry wash",
        "blazer dry wash", "blanket dry clean", "laundry shop", "tailor bill", "tailoring charge", "dorji bill",
        "dorji khoroch", "suit stitching", "panjabi banano", "shirt banano", "pant banano", "alternation",
        "zip change", "button lagano", "kapor fitting",
        "হেয়ার কাট", "দাড়ি কাটা", "দাড়ি ছাঁটা", "সেভিং করা", "সেভিং ফোম", "রেজার ব্লেড", "আফটারশেভ", "ফেসিয়াল",
        "গোল্ড ফেসিয়াল", "ভ্রু প্লাক", "ওয়াক্সিং", "মেনিকিউর", "পেডিকিউর", "পার্লার বিল", "বিউটি পার্লার", "ব্রাইডাল মেকআপ", "জেন্টস সেলুন",
        "লাক্স সাবান", "ডাভ সাবান", "বডি ওয়াশ", "শাওয়ার জেল", "সানসিল্ক শ্যাম্পু", "কন্ডিশনার", "হেয়ার অয়েল", "প্যারাসুট নারিকেল তেল",
        "কোলগেট", "ক্লোজআপ টুথপেস্ট", "টুথব্রাশ", "মাউথওয়াশ", "বডি স্প্রে", "পারফিউম", "আতর", "ট্যালকম পাউডার", "স্যানিটারি প্যাড",
        "ফেস স্ক্রাব", "ফেস প্যাক", "শিট মাস্ক", "টোনার", "গোলাপ জল", "সিরাম", "ময়েশ্চারাইজার", "কোল্ড ক্রিম", "ভেসলিন", "লিপবাম", "লিপস্টিক", "বডি লোশন", "সানস্ক্রিন", "সানব্লক", "নেইল কাটার", "মেকআপ রিমুভার",
        "জিম মাসিক ফি", "জিম ভর্তি ফি", "জিম ট্রেইনার ফি", "ফিটনেস ক্লাব", "যোগব্যায়াম ক্লাস", "সুইমিং পুল টিকিট", "বডি ম্যাসাজ", "স্পা ট্রিটমেন্ট",
        "লন্ড্রি বিল", "লন্ড্রির খরচ", "কাপড় ইস্ত্রি", "ড্রাই ক্লিন", "ব্লেজার ড্রাই ওয়াশ", "কম্বল ওয়াশ", "দর্জির বিল", "দর্জির খরচ", "জামা সেলাই", "প্যান্ট ফিটিং", "অল্টারেশন"
    ],

    "Salary": [
        "basic salary", "net salary", "gross salary", "salary credited", "salary account", "advance salary",
        "job salary", "job income", "company salary", "chakri theke beton", "masher shuru te salary", "week er salary",
        "weekly wage", "daily wage", "day labor wage", "diner mojury", "overtime pay", "arrears",
        "medical allowance", "house rent allowance", "conveyance allowance", "transport allowance", "food allowance",
        "providend fund", "pf refund", "gratuity", "final settlement", "severance pay", "company bonus", "salary pelam",
        "chakri theke salary", "monthly pay", "paycheck", "salary ashlo", "salary pelam ajke", "bujhe pelam salary",
        "daily hajira", "kajer mojury", "shromik mojury", "construction wage",
        "festival bonus", "boishakhi bonus", "durga puja bonus", "yearly bonus", "annual bonus", "performance bonus",
        "quarterly bonus", "sales incentive", "target bonus", "profit sharing", "referral bonus", "joining bonus",
        "signing bonus", "employee award", "cash prize", "honorarium", "shonmanona", "chief guest honorarium", "speaker fee",
        "freelance income", "freelance earnings", "freelancer money", "client payment pelam", "foreign client payment",
        "freelance bill", "remote job salary", "payoneer withdrawal", "payoneer to bkash", "wise transfer", "wise payout",
        "remittance", "foreign remittance", "probashi pathaise", "bidesh theke taka", "western union", "moneygram",
        "tap tap send", "dollar conversion", "adsense payout", "google adsense income", "youtube revenue", "youtube earning",
        "sponsorship", "brand deal", "affiliate commission", "affiliate income", "bug bounty reward", "freelance contract",
        "freelance payout", "freelance gig", "gig payment", "remote gig", "marketplace payout", "dollar payout",
        "online earning", "online income", "microtask payment", "freelancer earnings", "foreign client transfer",
        "direct bank deposit", "remittance ashlo", "bidesh theke pathalo", "western union payout", "moneygram transfer",
        "payoneer balance cashout", "wise direct deposit", "youtube monetization", "facebook payout", "sponsored post",
        "business profit", "monthly profit", "shop sale", "dokan bikri", "daily sale", "dukan er bikri", "trade profit",
        "contract profit", "consultancy fee", "legal fee received", "tuition earning", "private tuition income",
        "tuition taka pelam", "rental income", "tenant rent received", "car rent income",
        "agriculture income", "crop sale", "foshol bikri", "goru bikri", "cattle sale", "fish sale income", "mach bikri",
        "stock dividend", "share dividend", "share profit", "capital gain", "mutual fund return", "sanchayapatra profit",
        "dps profit", "dps maturity", "fdr interest", "fdr profit", "postal savings profit", "prize bond win", "prize bond prize", "lottery win",
        "bkash cashback", "nagad cashback", "credit card cashback", "daraz refund", "return refund", "ticket refund",
        "security deposit refund", "loan repayment received", "hawlat ferot pelam", "dhar deya taka pelam", "profit share", "investment return",
        "delivery commission", "sales commission", "ride share income", "pathao income", "delivery boy earning",
        "consulting payment", "workshop trainer fee", "dokan bikrir labh", "babshar profit", "dps poripakko",
        "fdr munafa", "sanchayapatra munafa", "post office munafa", "bank profit share", "share bechar labh", "stock profit",
        "cash dividend", "bonus share dividend", "bikashe taka ashlo", "nagade taka ashlo", "hawlat taka ferot", "dhar deya taka pawa",
        "advisory fee", "guest lecture fee", "training honorarium", "dhan bikri taka", "shobji bikri taka",
        "মাসিক বেতন", "বেতন একাউন্টে জমা", "অগ্রিম বেতন", "চাকরির বেতন", "ওভারটাইম পেমেন্ট", "দৈনিক মজুরি",
        "চিকিৎসা ভাতা", "যাতায়াত ভাতা", "বাড়ি ভাড়া ভাতা", "প্রভিডেন্ট ফান্ড টাকা", "গ্র্যাচুইটি", "বেতন ঢুকলো",
        "উৎসব ভাতা", "বৈশাখী ভাতা", "পূজা বোনাস", "বাৎসরিক বোনাস", "বার্ষিক বোনাস", "পারফরম্যান্স বোনাস", "সেলস ইনসেনটিভ", "সম্মানী ভাতা", "অতিথি সম্মানী",
        "ফ্রিল্যান্সার পেমেন্ট", "ক্লায়েন্ট পেমেন্ট", "পেওনিয়ার ক্যাশ আউট", "ওয়াইজ ট্রান্সফার", "প্রবাসী রেমিট্যান্স",
        "বিদেশ থেকে টাকা পাঠিয়েছে", "ইউটিউব ইনকাম", "গুগল এডসেন্স আয়", "স্পনসরশিপের টাকা", "এফিলিয়েট কমিশন",
        "ব্যবসায়িক লাভ", "দোকান বিক্রি", "দৈনিক বিক্রি", "ফসলের টাকা", "মাছ বিক্রির আয়", "গরু বিক্রির টাকা",
        "বাড়ি থেকে ভাড়া আয়", "দোকানের ভাড়া বাবদ আয়", "ভাড়া থেকে আয়", "সঞ্চয়পত্র মুনাফা", "ডিপিএস ভেঙে টাকা পেলাম",
        "এফডিআর লাভ", "প্রাইজবন্ড পুরস্কার", "শেয়ার ডিভিডেন্ড", "বিকাশ ক্যাশব্যাক", "রিফান্ড পেলাম", "ফেরত টাকা পেলাম", "ধার দেওয়া টাকা ফেরত"
    ]
};

const result: SeedFile = {
    version: 2,
    categories: {}
};

const seen = new Map<string, string>();
const heldoutSet = new Set(HELDOUT_ITEMS.map(i => normalizeSeedText(i.text)));

// 1. Load original 413 baseline seeds
for (const [cat, words] of Object.entries(ORIGINAL_SEEDS)) {
    result.categories[cat] = [];
    for (const w of words) {
        const norm = normalizeSeedText(w);
        if (seen.has(norm)) {
            console.error(`DUPLICATE in existing: "${w}" in ${cat} and ${seen.get(norm)}`);
        }
        seen.set(norm, cat);
        result.categories[cat].push(w);
    }
}

// 2. Add candidates with strict checks
let addedCount = 0;
let rejectedHeldout = 0;
let rejectedDuplicate = 0;
let rejectedTerm = 0;

for (const [cat, items] of Object.entries(ADDITIONS)) {
    for (const item of items) {
        const norm = normalizeSeedText(item);
        if (seen.has(norm)) {
            rejectedDuplicate++;
            continue;
        }

        if (heldoutSet.has(norm)) {
            console.error(`REJECTED HELDOUT ITEM: "${item}"`);
            rejectedHeldout++;
            continue;
        }

        // Check heldout terms
        const words = ` ${norm} `;
        let hasTerm = false;
        for (const term of HELDOUT_KEY_TERMS) {
            if (words.includes(` ${normalizeSeedText(term)} `)) {
                console.error(`REJECTED HELDOUT TERM "${term}" in "${item}"`);
                hasTerm = true;
                rejectedTerm++;
                break;
            }
        }
        if (hasTerm) continue;

        if (result.categories[cat].length >= 380) {
            continue;
        }

        seen.set(norm, cat);
        result.categories[cat].push(item);
        addedCount++;
    }
}

console.log(`Validation results:`);
console.log(`Added: ${addedCount}`);
console.log(`Rejected duplicate: ${rejectedDuplicate}`);
console.log(`Rejected heldout item: ${rejectedHeldout}`);
console.log(`Rejected heldout term: ${rejectedTerm}`);

console.log(`\nCounts per category:`);
let total = 0;
for (const [cat, words] of Object.entries(result.categories)) {
    console.log(`${cat.padEnd(20)}: ${words.length}`);
    total += words.length;
}
console.log(`Total entries: ${total}`);

writeFileSync(new URL('../src/lib/categoryEmbed/seeds.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(`Successfully updated seeds.json to version 2!`);
