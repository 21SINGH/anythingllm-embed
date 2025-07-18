export default async function handleChat(
  chatResult,
  setLoadingResponse,
  setChatHistory,
  remHistory,
  _chatHistory,
  host,
  embed_id,
  session_id
) {
  const {
    uuid,
    textResponse,
    type,
    sources = [],
    error,
    close,
    errorMsg = null,
  } = chatResult;

  // Preserve the sentAt from the last message in the chat history
  const lastMessage = _chatHistory[_chatHistory.length - 1];
  const sentAt = lastMessage?.sentAt;

  let modifiedResponse = textResponse;

  // if (textResponse.includes("@@SUGGESTIONS START@@")) {
  //   const suggestionMatch = textResponse.match(
  //     /@@SUGGESTIONS START@@\s*([\s\S]*?)\s*@@SUGGESTIONS END@@/
  //   );
  //   if (suggestionMatch) {
  //     try {
  //       const suggestionData = JSON.parse(suggestionMatch[1]);
  //       if (suggestionData.products?.length > 0) {
  //         console.log("Processing suggestion data:", suggestionData.products);

  //         const variantIds = suggestionData.products.map((product) => ({
  //           variant_id: product.variant_id.toString(),
  //         }));
  //         console.log("Fetching product details for variants:", variantIds);

  //         const apiResponse = await fetch(
  //           "https://shoppie-backend.goshoppie.com/api/products/product-by-variant",
  //           {
  //             method: "POST",
  //             headers: {
  //               "Content-Type": "application/json",
  //             },
  //             body: JSON.stringify({
  //               host: host,
  //               variant_ids: variantIds,
  //             }),
  //           }
  //         );

  //         const updatedProducts = await apiResponse.json();

  //         modifiedResponse = modifiedResponse.replace(
  //           suggestionMatch[0],
  //           `@@SUGGESTIONS START@@\n${JSON.stringify(
  //             { products: updatedProducts },
  //             null,
  //             2
  //           )}\n@@SUGGESTIONS END@@`
  //         );
  //       }
  //     } catch (e) {
  //       console.error("Failed to process API response:", e);
  //     }
  //   }
  // }

  if (textResponse.includes("@@SUGGESTIONS START@@")) {
    const suggestionMatch = textResponse.match(
      /@@SUGGESTIONS START@@\s*([\s\S]*?)\s*@@SUGGESTIONS END@@/
    );

    if (suggestionMatch) {
      try {
        const suggestionData = JSON.parse(suggestionMatch[1]);

        // Filter out products without variant_id
        const filteredProducts = (suggestionData.products || []).filter(
          (product) => !!product.variant_id
        );

        if (filteredProducts.length > 0) {
          console.log("Processing filtered suggestion data:", filteredProducts);

          const variantIds = filteredProducts.map((product) => ({
            variant_id: product.variant_id.toString(),
          }));

          console.log("Fetching product details for variants:", variantIds);

          const apiResponse = await fetch(
            "https://shoppie-backend.goshoppie.com/api/products/product-by-variant",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                host: host,
                variant_ids: variantIds,
              }),
            }
          );

          const updatedProducts = await apiResponse.json();

          modifiedResponse = modifiedResponse.replace(
            suggestionMatch[0],
            `@@SUGGESTIONS START@@\n${JSON.stringify(
              { products: updatedProducts },
              null,
              2
            )}\n@@SUGGESTIONS END@@`
          );
        } else {
          console.log("No valid variant_ids found, skipping product fetch.");
          // You can also choose to remove the entire SUGGESTIONS block if no valid variants
          modifiedResponse = modifiedResponse.replace(suggestionMatch[0], "");
        }
      } catch (e) {
        console.error("Failed to process API response:", e);
      }
    }
  }

  if (type === "abort") {
    setLoadingResponse(false);
    setChatHistory([
      ...remHistory,
      {
        uuid,
        content: modifiedResponse,
        role: "assistant",
        sources,
        closed: true,
        error,
        errorMsg,
        animate: false,
        pending: false,
        sentAt,
      },
    ]);
    _chatHistory.push({
      uuid,
      content: modifiedResponse,
      role: "assistant",
      sources,
      closed: true,
      error,
      errorMsg,
      animate: false,
      pending: false,
      sentAt,
    });
  } else if (type === "textResponse") {
    setLoadingResponse(false);
    setChatHistory([
      ...remHistory,
      {
        uuid,
        content: modifiedResponse,
        role: "assistant",
        sources,
        closed: close,
        error,
        errorMsg,
        animate: !close,
        pending: false,
        sentAt,
      },
    ]);
    _chatHistory.push({
      uuid,
      content: modifiedResponse,
      role: "assistant",
      sources,
      closed: close,
      error,
      errorMsg,
      animate: !close,
      pending: false,
      sentAt,
    });
  } else if (type === "textResponseChunk") {
    const chatIdx = _chatHistory.findIndex((chat) => chat.uuid === uuid);
    if (chatIdx !== -1) {
      const existingHistory = { ..._chatHistory[chatIdx] };
      const updatedHistory = {
        ...existingHistory,
        content: existingHistory.content + modifiedResponse,
        sources,
        error,
        errorMsg,
        closed: close,
        animate: !close,
        pending: false,
        sentAt,
      };
      _chatHistory[chatIdx] = updatedHistory;
    } else {
      _chatHistory.push({
        uuid,
        sources,
        error,
        errorMsg,
        content: modifiedResponse,
        role: "assistant",
        closed: close,
        animate: !close,
        pending: false,
        sentAt,
      });
    }
    setChatHistory([..._chatHistory]);
  }
  if (textResponse !== modifiedResponse) {
    const apiResponse = await fetch(
      "https://shoppie-backend.goshoppie.com/api/anythingllm/",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embed_id: embed_id,
          session_id: session_id,
          response: modifiedResponse,
        }),
      }
    );
  }
}

export function chatPrompt(workspace) {
  return (
    workspace?.openAiPrompt ??
    "Given the following conversation, relevant context, and a follow up question, reply with an answer to the current question the user is asking. Return only your response to the question given the above information following the users instructions as needed."
  );
}
