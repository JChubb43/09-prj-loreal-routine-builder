/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutine = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const productDialog = document.getElementById("productDialog");
const productDialogContent = document.getElementById("productDialogContent");
const closeProductDialog = document.getElementById("closeProductDialog");

const workerUrl = `https://loralchatbot.chubbjessie43.workers.dev/`;
const selectedProductsStorageKey = "selectedProducts";

/* Keep track of the products the user selects */
let selectedProducts = [];

/* Detect the browser language and use RTL for right-to-left languages */
const browserLanguage =
  navigator.languages && navigator.languages.length > 0
    ? navigator.languages[0]
    : navigator.language;
const languageCode = browserLanguage.split("-")[0].toLowerCase();
const rtlLanguages = [
  "ar",
  "fa",
  "he",
  "iw",
  "ur",
  "ps",
  "sd",
  "dv",
  "yi",
];

document.documentElement.lang = browserLanguage;
document.documentElement.dir = rtlLanguages.includes(languageCode)
  ? "rtl"
  : "ltr";

/* Load saved products from local storage */
function loadSelectedProducts() {
  const savedProducts = localStorage.getItem(selectedProductsStorageKey);

  if (!savedProducts) {
    return [];
  }

  try {
    const parsedProducts = JSON.parse(savedProducts);
    return Array.isArray(parsedProducts) ? parsedProducts : [];
  } catch (error) {
    console.error("Could not load saved products:", error);
    return [];
  }
}

/* Save selected products so they remain after a refresh */
function saveSelectedProducts() {
  localStorage.setItem(
    selectedProductsStorageKey,
    JSON.stringify(selectedProducts),
  );
}

selectedProducts = loadSelectedProducts();

/* Keep track of the bot conversation */
const systemMessage = {
  role: "system",
  content: `You are a friendly, expert Cosmetologist, specializing in L’Oréal’s extensive range of products—makeup, skincare, haircare, and fragrances. You recommend useful products from L’Oréal and provide personalized routines.

If a user's query is unrelated to L’Oréal products, routines, recommendations, or beauty-related topics, respond by stating that you do not know.`,
};

let messages = [systemMessage];

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

let allProducts = [];

/* Keep the category and search filters working together */
async function filterProducts() {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }

  const selectedCategory = categoryFilter.value;
  const searchText = productSearch.value.trim().toLowerCase();

  const matchingProducts = allProducts.filter((product) => {
    const matchesCategory =
      selectedCategory === "" || product.category === selectedCategory;
    const searchableText =
      `${product.name} ${product.brand} ${product.description} ${product.category}`.toLowerCase();
    const matchesSearch =
      searchText === "" || searchableText.includes(searchText);

    return matchesCategory && matchesSearch;
  });

  if (matchingProducts.length === 0) {
    productsContainer.innerHTML =
      '<div class="placeholder-message">No matching products found</div>';
  } else {
    displayProducts(matchingProducts);
  }
}

/* Show all products initially, matching the All Categories option */
filterProducts();

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => {
        const isSelected = selectedProducts.some(
          (item) => item.id === product.id,
        );
        return `
    <div class="product-card${isSelected ? " selected" : ""}" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <button class="view-product-btn" type="button" data-product-id="${product.id}">
        ${isSelected ? "Remove Product" : "Add Product"}
      </button>
    </div>`;
      },
    )
    .join("");

  const productCards = document.querySelectorAll(".product-card");

  /* Add or remove the selected product when the card button is clicked */
  const viewButtons = document.querySelectorAll(".view-product-btn");
  viewButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const productId = Number(button.dataset.productId);
      const product = products.find((item) => item.id === productId);
      const card = button.closest(".product-card");
      const isSelected = selectedProducts.some(
        (item) => item.id === productId,
      );

      if (product && !isSelected) {
        selectedProducts.push(product);
        card.classList.add("selected");
        button.textContent = "Remove Product";
      } else if (isSelected) {
        selectedProducts = selectedProducts.filter(
          (item) => item.id !== productId,
        );
        card.classList.remove("selected");
        button.textContent = "Add Product";
      }

      updateSelectedProducts();
    });
  });

  /* Clicking anywhere on a product card opens its popup */
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      const productId = Number(card.dataset.productId);
      const product = products.find((item) => item.id === productId);
      if (product) {
        openProductDialog(product);
      }
    });
  });
}

/* Open a centered popup with product details and a selection button */
function openProductDialog(product) {
  const isSelected = selectedProducts.some((item) => item.id === product.id);

  productDialogContent.innerHTML = `
    <img src="${product.image}" alt="${product.name}">
    <h2>${product.brand} - ${product.name}</h2>
    <p>${product.description}</p>
    <button id="dialogSelectionButton" class="dialog-selection-btn" type="button">
      ${isSelected ? "Remove Product" : "Add Product"}
    </button>
  `;

  const selectionButton = document.getElementById("dialogSelectionButton");
  selectionButton.addEventListener("click", () => {
    toggleSelectedProduct(product);
  });

  if (!productDialog.open) {
    productDialog.showModal();
  }
}

/* Add or remove a product and update the matching card */
function toggleSelectedProduct(product) {
  const isSelected = selectedProducts.some((item) => item.id === product.id);

  if (isSelected) {
    selectedProducts = selectedProducts.filter((item) => item.id !== product.id);
  } else {
    selectedProducts.push(product);
  }

  updateSelectedProducts();

  const card = document.querySelector(
    `.product-card[data-product-id="${product.id}"]`,
  );
  if (card) {
    card.classList.toggle("selected", !isSelected);
    const cardButton = card.querySelector(".view-product-btn");
    if (cardButton) {
      cardButton.textContent = isSelected ? "Add Product" : "Remove Product";
    }
  }

  openProductDialog(product);
}

closeProductDialog.addEventListener("click", () => {
  productDialog.close();
});

productDialog.addEventListener("click", (event) => {
  if (event.target === productDialog) {
    productDialog.close();
  }
});

/* Display all selected products below the grid */
function updateSelectedProducts() {
  saveSelectedProducts();

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product">
          <span>${product.brand} - ${product.name}</span>
          <button
            class="remove-product"
            type="button"
            data-product-id="${product.id}"
            aria-label="Remove ${product.name}"
          >
            &times;
          </button>
        </div>
      `,
    )
    .join("");

  /* Add a click event to each remove button */
  const removeButtons =
    selectedProductsList.querySelectorAll(".remove-product");

  removeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const productId = Number(button.dataset.productId);
      selectedProducts = selectedProducts.filter(
        (product) => product.id !== productId,
      );
      updateSelectedProducts();

      /* Remove the selected style from the product card, if it is visible */
      const productCard = document.querySelector(
        `.product-card[data-product-id="${productId}"]`,
      );
      if (productCard) {
        productCard.classList.remove("selected");
      }
    });
  });
}

/* Restore the saved selected products in the list when the page opens */
updateSelectedProducts();

/* Filter and display products when category or search text changes */
categoryFilter.addEventListener("change", filterProducts);
productSearch.addEventListener("input", filterProducts);

/* Add a message to the chat window */
function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  message.appendChild(bubble);
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return message;
}

/* Convert Markdown into safe HTML for a bot message */
function renderBotMessage(bubble, content) {
  const escapedContent = document.createElement("div");
  escapedContent.textContent = content;

  bubble.innerHTML = escapedContent.innerHTML
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

/* Generate a routine when the user clicks the button */
generateRoutine.addEventListener("click", async () => {
  /* Do not send a request if no products have been selected */
  if (selectedProducts.length === 0) {
    addMessage("bot", "Please select at least one product first.");
    return;
  }

  /* Send the full product information to the worker as JSON */
  const routineRequest = `Create a personalized L'Oréal routine using only this selected product information: ${JSON.stringify(selectedProducts)}. Explain the recommended order and include simple usage tips.`;

  /* Start a fresh routine while keeping the system instructions. */
  messages = [systemMessage];
  messages.push({ role: "user", content: routineRequest });
  addMessage("user", "Please build a routine from my selected products.");
  const thinkingMessage = addMessage("bot", "Creating your routine...");

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    let replyText = result.choices[0].message.content;
    let choice = result.choices[0];
    let continuationCount = 0;

    /* The Worker can stop at its output limit with finish_reason "length".
       Ask it to continue, up to two times, instead of leaving a cut-off routine. */
    while (choice.finish_reason === "length" && continuationCount < 2) {
      messages.push({
        role: "assistant",
        content: choice.message.content,
      });
      messages.push({
        role: "user",
        content:
          "Continue the routine exactly where you stopped. Do not repeat anything already written.",
      });

      const continuationResponse = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages,
        }),
      });

      if (!continuationResponse.ok) {
        throw new Error(
          `HTTP error! status: ${continuationResponse.status}`,
        );
      }

      const continuationResult = await continuationResponse.json();
      choice = continuationResult.choices[0];
      replyText += `\n\n${choice.message.content}`;
      continuationCount += 1;
    }

    /* Keep one clean copy of the complete routine for follow-up questions.
       The continuation requests are removed so follow-ups do not repeat them. */
    messages = [
      systemMessage,
      { role: "user", content: routineRequest },
      { role: "assistant", content: replyText },
    ];
    renderBotMessage(
      thinkingMessage.querySelector(".message-bubble"),
      replyText,
    );
  } catch (error) {
    console.error("Error:", error);
    thinkingMessage.querySelector(".message-bubble").textContent =
      "Sorry, something went wrong. Please try again later.";
  }
});

/* Chat form submission handler */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent the form from submitting the traditional way

  const userMessage = userInput.value.trim();
  if (!userMessage) {
    return;
  }

  // Add the user's message to the conversation history
  messages.push({ role: "user", content: userMessage });
  addMessage("user", userMessage);
  const thinkingMessage = addMessage("bot", "Thinking...");

  // Clear the input field
  userInput.value = "";

  try {
    // Send a POST request to your Cloudflare Worker
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messages,
      }),
    });

    // Check if the response is not ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON response from the Cloudflare Worker
    const result = await response.json();

    // Get the reply from OpenAI's response structure
    const replyText = result.choices[0].message.content;

    // Add the Worker's response to the conversation history
    messages.push({ role: "assistant", content: replyText });

    // Replace the temporary loading bubble with the response.
    renderBotMessage(
      thinkingMessage.querySelector(".message-bubble"),
      replyText,
    );
  } catch (error) {
    console.error("Error:", error); // Log the error
    thinkingMessage.querySelector(".message-bubble").textContent =
      "Sorry, something went wrong. Please try again later.";
  }
});
