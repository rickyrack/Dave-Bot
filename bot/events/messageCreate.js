const { Events } = require('discord.js');
const { get_wiki } = require('../helper/get_wiki.js');
const globals = require('../helper/global_variables.js');
const { Replies } = require('../DB/functions/dbObjects.js');
const { Sequelize } = require('sequelize');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		await reply_to_mention(message);
		await send_wiki_text(message);
		await send_poem(message);
	},
};

// placing various message functions under here.
// these could be moved to their own file if it proves too much for one file.
async function send_wiki_text(message){
	if(message.content.length == 0 || message.author.bot){
		return;
	}
	// valid message test if going to send a chunk of text
	if(Math.random() <= globals.MESSAGE_CHANCE){
		//message will be sent
		let wiki_text = await get_wiki();
		await message.channel.send('Let me tell you somethin\'...');
		await message.channel.sendTyping();
		setTimeout(() => {
			message.channel.send(wiki_text).catch(error => {message.channel.send('You know what... nevermind.');});
		}, "5000");
	}
}

async function reply_to_mention(message){
	if(message.content.length == 0 || message.author.bot){
		return;
	}
	if(Math.random() <= globals.REPLY_CHANCE){
		const DAVE_ID = "534608357001265152";
		if(message.content.includes(DAVE_ID) || message.content.toUpperCase().includes("DAVE")){
			//dave mentioned in message
			const REPLY = await Replies.findOne({order: Sequelize.literal('random()')});
			await message.channel.send(REPLY.text);
		}
	}
}

async function send_poem(message) {
    if (message.content.length == 0 || message.author.bot) {
        return;
    }
    if (Math.random() <= globals.POEM_CHANCE) {
        // have dave send a random poem
        await message.channel.send(`I feel inspired...`);
        await message.channel.sendTyping();
        try {
            const response = await fetch(`https://poetrydb.org/random`);
            const poem_json = await response.json();
            const title = poem_json[0].title;
            let fullpoem = "";
			let new_line_count = 0;
			while(true){
				if(new_line_count >= poem_json[0].lines.length){
					// end of poem reached
					break;
				}
				else if(new_line_count >= 15){
					//break if getting too long
					break;
				}
				else if(new_line_count >= 5 && poem_json[0].lines[new_line_count] == ""){
					// attempt to get to at least the end of the paragraph
					break;
				}
				else{
					// add line to poem
					if(poem_json[0].lines[new_line_count] != ""){
						fullpoem += `*${poem_json[0].lines[new_line_count]}*\n`;
					}
					new_line_count++;
				}
			}
            const final_poem = `**${title}**\n__By David__\n${fullpoem}`;
            message.channel.send(final_poem);
        } catch (err) {
			console.log(error)
            message.channel.send(`Nevermind...`);
        }
    }
}