const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
} = require("discord.js");
const getUser = require("../../../backend/firestore/main/getUser");
const convertNut = require("../../../backend/firestore/main/convertNut");
const {
  updateItemTimer,
} = require("../../../backend/firestore/utility/updateItemTimer");
const { updateNut } = require("../../../backend/firestore/main/update_nut");
const {
  updateNutBusterUses,
} = require("../../../backend/firestore/utility/update_nutBuster_uses");
const useItem = require("../../helper/items/use_item");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jerkme")
    .setDescription("🧑 Check the stat sheet! 😊"),

  async execute(interaction) {
    const user = interaction.user;
    let userData = await getUser(user);
    //const itemsData = await getItems();
    //console.log(itemsData);

    let genFields = (data) => {
      userData.ballsMax = '200';
      if (Object.keys(userData.items.upgrades).includes('left_foot_storage'))
        userData.ballsMax = '300';
      if (Object.keys(userData.items.upgrades).includes('right_foot_storage'))
        userData.ballsMax = '400';

      return [{
        name: "Nut Bricks",
        value: `🧱 ${data.stats.nutBricks}`,
        inline: true,
      },
      { name: "Nut", value: `💦 ${data.stats.nut}`, inline: true },
      {
        name: "Balls",
        value: `💧 ${data.stats.jerkStores}/${data.ballsMax}`,
        inline: true,
      },
      {
        name: "Daily Jerks Remaining",
        value: `${data.stats.maxJerks - data.stats.jerks}/${
          data.stats.maxJerks
        }`,
      },
      { name: "Backpack", value: `${backpackText}`, inline: true },
      { name: "Nutgrades", value: `${upgradesText}`, inline: true }
    ]}
    let statsDesc = ""; //`Nut Blocks: ${userData.stats.nutBlocks} 💦🧱\nNut: ${userData.stats.nut} 💦\nBalls: ${userData.stats.jerkStores}/200 💦`;
    statsDesc +=
      "Clippy says: If you store more nut in the balls, you generate more nut more faster!";

    //const shortInv = invCondenser(userData.items.backpack);

    let backpackText = "";
    let upgradesText = "";

    Object.keys(userData.items.upgrades).forEach((itemId) => {
      const item = userData.items.upgrades[itemId];
      upgradesText += `${item.name}\n${item.info}`;
    })

    const itemSelect = new StringSelectMenuBuilder()
      .setCustomId("item")
      .setPlaceholder("Backpack");

    const row1 = new ActionRowBuilder().addComponents(itemSelect);

    Object.keys(userData.items.backpack).forEach((itemId) => {
      const item = userData.items.backpack[itemId];
      backpackText += `${
        item?.quantity ? `Quantity: ${item?.quantity}` : `Uses: ${item.uses}`
      } | ${item.name}${
        item?.level
          ? ` | Level: ${item.level} / ${item.levelStats.maxLevel}`
          : ""
      }\n`;
      itemSelect.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`${item.name} - "${item.desc}"`)
          .setDescription(
            `${
              item?.quantity
                ? `Quantity: ${item.quantity}`
                : `Uses: ${item.uses}`
            } | Type: ${
              item.type === "consumable"
                ? "one-shot"
                : item.type === "upgrade"
                ? "upgrade"
                : "unknown"
            }${item?.level ? ` | Level: ${item.level}` : ""}`
          )
          .setValue(`${itemId}`)
      );
    });

    if (!backpackText) backpackText = "Broke ahh 😔";
    if (!upgradesText)
      upgradesText = "You lookin hella normal right now bro 🤓";

    const statsEmbed = new EmbedBuilder()
      .setTitle("🥩 My Stuff 🧱")
      .setDescription(`${statsDesc}`)
      .setFields(genFields(userData));

    const convertNutButton = new ButtonBuilder()
      .setCustomId("convert")
      .setLabel("💦 Smelt Nut 🧱")
      .setStyle(ButtonStyle.Primary);

    if (userData.stats.nut < 1000) convertNutButton.setDisabled(true);

    const cleanBusterButton = new ButtonBuilder()
      .setCustomId("cleanBuster")
      .setLabel("🧰 Clean Nut Buster 🔦 [💦 300]")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true);

    if (Object.keys(userData.items.backpack).includes("nut_buster")) {
      cleanBusterButton.setDisabled(false);
    }

    const row2 = new ActionRowBuilder().addComponents(
      convertNutButton,
      cleanBusterButton
    );

    let msg;

    if (Object.keys(userData.items.backpack).length > 0) {
      msg = await interaction.reply({
        embeds: [statsEmbed],
        components: [row1, row2],
        ephemeral: true,
      });
    } else {
      msg = await interaction.reply({
        embeds: [statsEmbed],
        components: [row2],
        ephemeral: true,
      });
    }

    const buttonFilter = (i) => {
      return (i.user.id = user.id);
    };

    const buttonCollector = msg.createMessageComponentCollector({
      filter: buttonFilter,
      time: 90000,
    });

    buttonCollector.on("collect", async (i) => {
      const choice = i?.values?.[0] || i.customId;
      if (i?.values?.[0]) {
        buttonCollector.stop();
        userData.items.backpack[choice].id = choice;
        await i.deferUpdate();
        await useItem(interaction, userData, userData.items.backpack[choice]);
      } else if (choice === "convert") {
        await convertNut(user);
        convertNutButton.setDisabled(true);
        userData = await getUser(user);
        const newStatsEmbed = new EmbedBuilder()
          .setTitle("🥩 My Stuff 🧱")
          .setDescription(`${statsDesc}`)
          .setFields(genFields(userData));

        if (userData.items.backpack.length > 0) {
          await i.update({
            embeds: [newStatsEmbed],
            components: [row1, row2],
            ephemeral: true,
          });
        } else {
          await i.update({
            embeds: [newStatsEmbed],
            components: [row2],
            ephemeral: true,
          });
        }

        buttonCollector.stop("Button Clicked");
      } else if (choice === "cleanBuster") {
        if (userData.stats.nut - 300 < 0) {
          const cleanBuster = new EmbedBuilder().setTitle(
            "🔦 You need 300 💦 to clean your Nut Buster! ❌💦"
          );

          buttonCollector.stop("Button Clicked");

          return await i.update({
            embeds: [cleanBuster],
            components: [],
          });
        }

        let currUseTime = new Date();
        let checkTime = new Date(userData.items.backpack?.nut_buster.lastClean);
        const timePassed = currUseTime.getTime() - checkTime.getTime();
        if (
          !userData.items.backpack?.nut_buster.lastClean ||
          timePassed >
            userData.items.backpack?.nut_buster.levelStats.cleanTimer[
              userData.items.backpack?.nut_buster.level - 1
            ] *
              60 *
              60 *
              1000
        ) {
          await updateItemTimer(user, "items.backpack.nut_buster.lastClean");
          await updateNut(user, -300);
          await updateNutBusterUses(user, 4);

          const cleanBuster = new EmbedBuilder()
            .setTitle("🔦 You sent your Nut Buster in for a deep clean! 🧹")
            .setDescription(
              `You have 4 more uses!\nYou can use your Nut Buster in ${
                userData.items.backpack.nut_buster.levelStats.cleanTimer[
                  userData.items.backpack.nut_buster.level - 1
                ]
              } Hours\n
            If you increase your Nut Buster's level, it will be easier to clean! 🤢💦`
            );

          buttonCollector.stop("Button Clicked");

          return await i.update({
            embeds: [cleanBuster],
            components: [],
          });
        } else {
          const cleanBuster = new EmbedBuilder().setTitle(
            "🔦 Your Nut Buster is already out for a deep clean! 🧹"
          );

          buttonCollector.stop("Button Clicked");

          return await i.update({
            embeds: [cleanBuster],
            components: [],
          });
        }
      }
    });

    buttonCollector.on("end", async (collected, reason) => {
      /*if (reason !== 'Button Clicked') {
            }*/
    });
  },
};
