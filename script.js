/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutine = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

const workerUrl =  `https://loralchatbot.chubbjessie43.workers.dev/`

/* Keep track of the products the user selects */
let selectedProducts = [];

/* Keep track of the bot conversation */
let messages = [
  { role: 'system', content: `You are a friendly, expert Cosmetologist, specializing in L’Oréal’s extensive range of products—makeup, skincare, haircare, and fragrances. You recommend useful products from L’Oréal and provide personalized routines. 

  If a user's query is unrelated L’Oréal products, routines, recommendations, or beauty-related topics, respond by stating that you do not know.`}
];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
    </div>
  `,
    )
    .join("");

  /* Add a click event to each product card */
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      const productId = Number(card.dataset.productId);
      const product = products.find((item) => item.id === productId);

      /* Add the product once, if it has not already been selected */
      if (product && !selectedProducts.some((item) => item.id === productId)) {
        selectedProducts.push(product);
        updateSelectedProducts();
      }
    });
  });
}

/* Display all selected products below the grid */
function updateSelectedProducts() {
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product">
          ${product.brand} - ${product.name}
        </div>
      `,
    )
    .join("");
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products 
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory,
  );

  displayProducts(filteredProducts);
});

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

/* Replace the Thinking message with the bot's response */
function renderBotMessage(bubble, text) {
  bubble.textContent = text;
  bubble.style.whiteSpace = "pre-wrap";
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

  messages.length = 0; // clears message history for new request
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
    const replyText = result.choices[0].message.content;

    /* Keep the routine in the conversation for follow-up questions */
    messages.push({ role: "assistant", content: replyText });
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
chatForm.addEventListener("submit", async(event) => {
  event.preventDefault(); // Prevent the form from submitting the traditional way

  const userMessage = userInput.value.trim();
  if (!userMessage) {
    return;
  }

  // Add the user's message to the conversation history
  messages.push({ role: 'user', content: userMessage });
  addMessage("user", userMessage);
  const thinkingMessage = addMessage("bot", "Thinking...");

  try {
    // Send a POST request to your Cloudflare Worker
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    messages.push({ role: 'assistant', content: replyText });

    // Replace the temporary loading bubble with the response.
    renderBotMessage(
      thinkingMessage.querySelector(".message-bubble"),
      replyText,
    );
  } catch (error) {
    console.error('Error:', error); // Log the error
    thinkingMessage.querySelector(".message-bubble").textContent =
      'Sorry, something went wrong. Please try again later.';
  }

  // Clear the input field
  userInput.value = '';
});
