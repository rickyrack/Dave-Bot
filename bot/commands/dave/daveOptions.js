const { EmbedBuilder } = require('@discordjs/builders');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const globals = require('../../helper/global_variables.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('daveoptions')
		.setDescription("Modify the chances dave bot does a random event")
		.addStringOption(option =>
			option.setName('action')
				.setDescription('The random action to modify')
				.addChoices(
					{name: 'Reply',value:'reply'},
					{name: 'Yap',value:'yap'},
				)
				.setRequired(true))
		.addIntegerOption(option =>
			option.setName('chance')
				.setDescription('The percent chance the event happens')
				.setMinValue(0)
				.setMaxValue(100)
				.setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	async execute(interaction) {
		const action_option = interaction.options.getString('action')
		const action_percent = interaction.options.getInteger('chance')
		if(action_option == 'reply'){
			const old_percentage = globals.REPLY_CHANCE
			globals.REPLY_CHANCE = action_percent*.01
			interaction.reply({content:`Reply chance has been updated from ${old_percentage} to ${globals.REPLY_CHANCE}`,ephemeral:true})
		}
		else{
			const old_percentage = globals.MESSAGE_CHANCE
			globals.MESSAGE_CHANCE = action_percent*.01
			interaction.reply({content:`Yap chance has been updated from ${old_percentage} to ${globals.MESSAGE_CHANCE}`,ephemeral:true})
		}
	},
};