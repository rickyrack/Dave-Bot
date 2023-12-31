const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require("@discordjs/builders");
const { ButtonStyle } = require("discord.js");
const getUsers = require("../../../backend/firestore/main/getUsers");
const { removeItem } = require("../../../backend/firestore/utility/remove_item");
const { updateSeek } = require("../../../backend/firestore/utility/update_seek");
const { updateNut } = require("../../../backend/firestore/main/update_nut");
const { updateBalls } = require("../../../backend/firestore/main/update_balls");
const getUser = require("../../../backend/firestore/main/getUser");
const { updateWomanProtected } = require("../../../backend/firestore/utility/update_woman_protected");

let client = null;
exports.receiveClient = (clientClass) => {
    client = clientClass;
}

exports.nutBuster = async (i, userData, item) => {
    const user = i.user;
    const usersData = await getUsers();

    const seeked = userData.stats.lastSeek;
    const busterFields = [];

    const optionRow = new ActionRowBuilder()

    const itemEmbed = new EmbedBuilder()
        .setTitle(`~ ${item.name} ~ [Level: ${item.level} / ${item.levelStats.maxLevel}]`)
        .setThumbnail(`${item.img}`);

    if (item.uses === 1) {
        itemEmbed.setDescription(`Using your ${item.name} without cleaning will break it for good!`)
        return await i.editReply({
            embeds: [itemEmbed],
            components: []
        });
    }

    let currUseTime = new Date();
    //currUseTime = new Date(currUseTime).getUTCDate();
    //currUseTime = currUseTime.getUTCDate();

    if (item.lastClean) {
        let checkTime = new Date(item.lastClean);
        const timePassed = currUseTime.getTime() - checkTime.getTime();
        if (timePassed < item.levelStats.cleanTimer[item.level - 1] * 60 * 60 * 1000) {
            let timeLeft = '';
            timeLeft += `${((item.levelStats.cleanTimer[item.level - 1] * 60 * 60 * 1000) - timePassed) / (60 * 60 * 1000) >= 1 ? `${Math.floor(((item.levelStats.cleanTimer[item.level - 1] * 60 * 60 * 1000) - timePassed) / (60 * 60 * 1000))} Hours and ` : '0 Hours and '}`;
            timeLeft += `${Math.floor(((item.levelStats.cleanTimer[item.level - 1] * 60 * 60 * 1000) - timePassed) / (60 * 1000)) % 60} minutes`;
            itemEmbed.setDescription(`🧹 Your ${item.name} is still being cleaned for ${timeLeft}! 🤮`)
            return await i.editReply({
                embeds: [itemEmbed],
                components: []
            });
        }
    }

    if (item.cooldown.lastUse) {
        let checkTime = new Date(item.cooldown.lastUse);
        const timePassed = currUseTime.getTime() - checkTime.getTime();
        if (timePassed < item.cooldown.baseMin * 60 * 1000) {
            let timeLeft = '';
            timeLeft += `${Math.floor(((item.cooldown.baseMin * 60 * 1000) - timePassed) / 60 / 1000)} more minutes`;
            itemEmbed.setDescription(`🥤 Your ${item.name} is cooling off for ${timeLeft}! 😅`)
            return await i.editReply({
                embeds: [itemEmbed],
                components: []
            });
        }
    }

    if (seeked.length === 0) {
        itemEmbed.setDescription('🧐 You must use the Semen Seeker first to find some full balls! 💧')
        return await i.editReply({
            embeds: [itemEmbed],
            components: []
        });
    }

    for (let i = 0; i < seeked.length; i++) {
        busterFields.push({
            name: `${usersData[seeked[i]].username}`, value: `💦 ${usersData[seeked[i]].stats.jerkStores}`
        });

        optionRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`${seeked[i]}`)
                .setLabel(`${usersData[seeked[i]].username}`)
                .setStyle(ButtonStyle.Success)
        )
    }

    itemEmbed
        .setDescription('Who do you want to bust?')
        .setFields(busterFields);

    let msg = await i.editReply({
        embeds: [itemEmbed],
        components: [optionRow]
    });

    const itemFilter = int => {
        return int.user.id === user.id;
    }

    const itemCollector = msg.createMessageComponentCollector({
        filter: itemFilter,
        time: 60000
    });

    itemCollector.on('collect', async (int) => {
        await int.deferUpdate();
        userData = await getUser(user);
        await removeItem(userData, item, true);
        const bustId = int.customId;
        const nutAmt = Math.floor(usersData[bustId].stats.jerkStores / item.levelStats.extractDivider[item.level - 1]);
        await updateSeek(user, seeked.filter(id => id !== bustId));


        itemEmbed
            .setDescription(`💦 🔦 You extracted 💦 ${nutAmt} from ${usersData[bustId].username}'s balls!\nYou now have 💦 ${userData.stats.nut + nutAmt}`)
            .setFields();

        const dmEmbed = new EmbedBuilder()
            .setTitle(`😡 ${userData.username} extracted 💦 ${nutAmt} from your balls! 😡`)
            .setThumbnail(`${item.img}`)
        
        //woman stuff
        if (usersData[bustId].items.backpack?.woman?.active) {
            const womanItem = usersData[bustId].items.backpack.woman;
            womanItem.id = 'woman';
            await removeItem(usersData[bustId], usersData[bustId].items.backpack.woman);
            itemEmbed.setDescription(
            `👩 A woman distracted you and made you nut a little!\nYou now have 💦 ${userData.stats.jerkStores - userData.stats.jerkStores / 2} in your balls. 😔`
            )
            .setThumbnail(`${usersData[bustId].items.backpack.woman.img}`)
            dmEmbed
                .setTitle(`👩 ${userData.username} was distracted by your escort! Your balls are warm and safe. 🤩`)
            await updateBalls({id: user.id}, -(userData.stats.jerkStores / 2));
            await updateWomanProtected({id: bustId}, nutAmt);
        }
        else {
            await updateNut(user, nutAmt);
            await updateBalls({id: bustId}, -nutAmt);
        }

        await int.editReply({
            embeds: [itemEmbed],
            components: []
        });
        const bustSnowflake = await client.users.fetch(`${bustId}`)
        await bustSnowflake.send({ embeds: [dmEmbed] });
        itemCollector.stop();
    });

    itemCollector.on('end', async (collected, reason) => {

    });
}