const Discord = require('discord.js');
const Commando = require('discord.js-commando');

module.exports = class ClearDMsCommand extends Commando.Command {
    constructor(client) {
        super(client, {
            name: 'cleardms',
            aliases: [],
            group: 'util',
            memberName: 'cleardms',
            description: 'Deletes all bot messages in your DMs.',
            throttling: {
                usages: 1,
                duration: 30
            }
        });
    }

    run(message) {
        message.author.createDM()
        .then(dmChannel => {
            dmChannel.messages.fetch( { limit: 100 })
            .then(messages => {
                let size = messages.size;
                messages = messages.filter(msg => { return msg.author.id == this.client.user.id });

                if (size == 0) return message.channel.send("⚠️ - No messages to delete!")
                //if (size != messages.size) return message.channel.send("⚠️ - You must delete all DMs sent by you first!");

                size = messages.size;
                message.channel.send(`🗑 - Deleting \`${size}\` messages from our DM history. (This may take some time!)`);
                messages.forEach(msg => {
                    msg.delete()
                    .then(() => {
                        size--;
                        if (size == 0) message.channel.send('✅ - Message deletion successful!');
                    });
                });
            });
        });
    }
}


/*client.users.fetch( '331602608861216769' )
    .then( u => {

        u.createDM()
        .then( dmchannel => { 
            dmchannel.messages.fetch( { limit: 100 } )
            .then( messages => {

                let c = messages.size;
                messages = messages.filter( m => { return m.author.id === client.user.id } );

                if( c !== messages.size ){

                   console.log( `No can do - ${u.toString()} must delete DMs to ${this.toString()}` +
                    `  before ${this.toString()} can delete my DMs to ${u.toString()}. (Discord API quirk.)` );

                }else{

                    c = messages.size;
                    console.log( `Deleting ${c} DMs.` );

                    messages.forEach( msg => {

                        msg.delete()
                        .then( () => {

                            c --;
                            if( c === 0 ) console.log( 'DMs deleted successfully.');

                        } ).catch( err => { console.log( `Error occurred while deleting DMs.\n${err}` ) } );

                    } );//end messages.forEach

                }//end if( c !===

            } ).catch( err => { console.log( `Error occurred while fetching DMs.\n${err}` ) } );

        } ).catch( err => { console.log( `Error occurred while resolving DM channel.\n${err}` ) } );

    } ).catch( err => { console.log( `Error occurred while fetching user.\n${err}` ) } );*/