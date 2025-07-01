const BrandBotConfigure = {
  getBotDetails: async function (host) {
    const url = `https://shoppie-backend.goshoppie.com/api/widget_theme/?host=${host}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch brand details");
      }

      const data = await response.json();
            
      const body = {
        brandName: data.theme.name,
        brandImageUrl: data.theme.brandLogo,
        userBgColor: data.theme.messageBubbleColor,
        assistantBgColor: data.theme.assistantChatBubbleColor,
        headerColor: data.theme.headerBackgroundColor,
        textHeaderColor: data.theme.headerTextColor,
        userTextColor: data.theme.messageTextColor,
        botTextColor: data.theme.assistantMessageTextColor,
        cardTextColor: data.theme.cardTitleTextColor,
        cardTextSubColour: data.theme.cardSubtitleColor,
        prompotBgColor: data.theme.messageBubbleColor,
        promptBorderColor: data.theme.messageBubbleColor,
        bgColor: data.theme.backgroundColor,
        inputbarColor: data.theme.inputBarColor,
        cardBgColor: data.theme.cardBackgroundColor,
        openingMessage: data.theme.welcomeMessage,
        openingMessageTextColor: data.theme.displayMessageTextColor,
        inputTextColor: data.theme.inputTextColor,
        suggestion1: data.theme.suggestion1,
        suggestion2: data.theme.suggestion2,
        suggestion3: data.theme.suggestion3,
        suggestion4: data.theme.suggestion4,
        suggestion5: data.theme.suggestion5,
        nudgeBgColor: data.theme.displayMessageBackgroundColor,
        nudgeTextColor: data.theme.displayMessageTextColor,
        logoBackgroundColor:data.theme.logoBackgroundColor,
        bottom:data.theme.bottom,
        sides:data.theme.sides,
        position:data.theme.position
      };

      return body;
    } catch (error) {
      console.error("Error fetching brand details:", error);
      return null;
    }
  },
};

export default BrandBotConfigure;
