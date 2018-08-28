const { TOKEN, PREFIX, GOOGLE_API_KEY } = require('./config.js');
const { Util, RichEmbed } = require('discord.js');

const Discord = require('discord.js');
const YouTube = require('simple-youtube-api');
const moment = require('moment');
require('moment-duration-format');
const ytdl = require('ytdl-core');

const youtube = new YouTube(GOOGLE_API_KEY);
const client = new Discord.Client();
const queue = new Map();
console.log("MusicBot")
client.on('message', async msg => { // eslint-disable-line

  if (msg.author.bot || !msg.content.startsWith(PREFIX)) return undefined;

  const args = msg.content.split(' ');
  const searchString = args.slice(1).join(' ');
  const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';
  const serverQueue = queue.get(msg.guild.id);
 
  let command = msg.content.toLowerCase().split(" ")[0];
  command = command.slice(PREFIX.length);     
  if (command === `play`) {
    const voiceChannel = msg.member.voiceChannel;

    if (!voiceChannel) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('FlightMusic 🎶')
    .setDescription('**:x: يجب أن تكون في روم صوتي**')
    .setColor('RANDOM')
    .setFooter('discord.js'));

    const permissions = voiceChannel.permissionsFor(msg.client.user);

    if (!permissions.has('CONNECT')) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription('**:x: لا يوجد لدي صلاحيات لدخول الروم**')
    .setColor('RANDOM')
    .setFooter('discord.js'));
    if (!permissions.has('SPEAK')) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription('**:x: لا يوجد لدي صلاحيات للتكلم في الروم**')
    .setColor('RANDOM')
    .setFooter('discord.js'));
 
    if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
      const playlist = await youtube.getPlaylist(url);
      const videos = await playlist.getVideos();

      for (const video of Object.values(videos)) {
        const video2 = await youtube.getVideoByID(video.id);
        await handleVideo(video2, msg, voiceChannel, true);
      }

      return msg.channel.sendEmbed(new RichEmbed()
      .setTitle('discord.js 🎶')
      .setDescription('**تم أضافة قائمة التشغيل هذه**')
      .setColor('RANDOM')
      .setFooter('discord.js'))
    } else {
      try {
        var video = await youtube.getVideo(url);
      } catch (error) {
        try {
          var videos = await youtube.searchVideos(searchString, 10);
          let index = 0;

          msg.channel.sendEmbed(new RichEmbed()
          .setTitle('discord.js 🎶')
          .setDescription(`** ${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')} **`)
          .setColor('RANDOM')
          .setFooter('discord.js'));

          try {
            var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
              maxMatches: 1,
              time: 10000,
              errors: ['time']
            });
          } catch (err) {
            console.error(err);
            return msg.channel.sendEmbed(new RichEmbed()
            .setTitle('discord.js 🎶')
            .setDescription('**:x: تم وضع رقم خاطئ , أو تأخرت بأختيار الفيديو**')
            .setColor('RANDOM')
            .setFooter('discord.js'));
          }

          const videoIndex = parseInt(response.first().content);
          var video = await youtube.getVideoByID(videos[videoIndex - 1].id);

        } catch (err) {
          console.error(err);
          return msg.channel.sendEmbed(new RichEmbed()
          .setTitle('discord.js 🎶')
          .setDescription('**:x: لا يوجد أي مقطع فيديو بهذا الأسم**')
          .setColor('RANDOM')
          .setFooter('discord.js'))
        }
      }

      return handleVideo(video, msg, voiceChannel);
    }
  } else if (command === `skip`) {
    if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription('**:x: أنت لست بروم صوتي**')
    .setColor('RANDOM')
    .setFooter('discord.js'));
    if (!serverQueue) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription('**:x: لا يوجد شيء مشغل حاليا**')
    .setColor('RANDOM')
    .setFooter('discord.js'));

    serverQueue.connection.dispatcher.end('skip');
    return undefined;
  } else if (command === `stop`) {
    if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription('**:x: أنت لست بروم صوتي**')
    .setColor('RANDOM')
    .setFooter('discord.js'));
    if (!serverQueue) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription('**:x: لا يوجد أي أغنية مشغلة حاليا**')
    .setColor('RANDOM')
    .setFooter('discord.js'));

    serverQueue.songs = [];

    serverQueue.connection.dispatcher.end('stop');
    return undefined;
  } else if (command === `volume`) {
    if (!msg.member.voiceChannel) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription('**:x: أنت لست بروم صوتي**')
    .setColor('RANDOM')
    .setFooter('discord.js'));
    if (!serverQueue) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription('**:x: لا يوجد شيء مشغل حاليا**')
    .setColor('RANDOM')
    .setFooter('discord.js'));
    if (!args[1]) return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription(`** الصوت حاليا ${serverQueue.volume}`)
    .setColor('RANDOM')
    .setFooter('discord.js'));

    serverQueue.volume = args[1];
    serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);

    return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription(`**הוליום השתנה ל- ${args[1]}**`)
    .setColor('RANDOM')
    .setFooter('discord.js'));
  } else if (command === `np`) {
    if (!serverQueue) return msg.channel.send('There is nothing playing.');
console.log(serverQueue.connection);
    return msg.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription(`**The current playing song: ${serverQueue.songs[0].title}**\n\n__**Time:**__\n[${moment.duration(serverQueue.connection.dispatcher.time).format('h [hours], m [minutes], s [seconds]')} / ${serverQueue.songs[0].time}]`)
    .setColor('RANDOM')
    .setFooter('discord.js'))
  } else if (command === `queue`) {
    if (!serverQueue) return msg.channel.send('There is nothing playing.');
    return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription(`**רשימת השמעה\n\n${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}\n\n השיר שמושמע עכשיו-${serverQueue.songs[0].title}**`) 
    .setColor('RANDOM')
    .setFooter('discord.js'));
  } else if (command === `pause`) {
    if (serverQueue && serverQueue.playing) {
      serverQueue.playing = false;
      serverQueue.connection.dispatcher.pause();

      return msg.channel.sendEmbed(new RichEmbed()
      .setTitle('discord.js 🎶')
      .setDescription(`**השיר מושהה**`)
      .setColor('RANDOM')
      .setFooter('discord.js'))
    }

    return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription(`**:x:השיר ממשיך**`)
    .setColor('RANDOM')
    .setFooter('discord.js'));
  } else if (command === `resume`) {
    if (serverQueue && !serverQueue.playing) {
      serverQueue.playing = true;
      serverQueue.connection.dispatcher.resume();

      return msg.channel.sendEmbed(new RichEmbed()
      .setTitle('discord.js 🎶')
      .setDescription(`השיר ממשיך`)
      .setColor('RANDOM')
      .setFooter('discord.js'));
    }

    return msg.channel.sendEmbed(new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription(`**:x: لا يوجد شيء مشغل حاليا**`)
    .setColor('RANDOM')
    .setFooter('discord.js'));
  }
  return undefined;
});
 
async function handleVideo(video, msg, voiceChannel, playlist = false) {
  const serverQueue = queue.get(msg.guild.id);

  const song = {
    id: video.id,
    title: Util.escapeMarkdown(video.title),
    time: moment.duration(video.durationSeconds, 'seconds').format('h [hours], m [minutes], s [seconds]'),
      url: `https://www.youtube.com/watch?v=${video.id}`
  };
  if (!serverQueue) {
    const queueConstruct = {
      textChannel: msg.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
    };
    queue.set(msg.guild.id, queueConstruct);
 
    queueConstruct.songs.push(song);
 
    try {
      var connection = await voiceChannel.join();
      queueConstruct.connection = connection;
      play(msg.guild, queueConstruct.songs[0]);
    }
    catch (error) {
      console.error(`I could not join the voice channel: ${error}`);
      queue.delete(msg.guild.id);
      return msg.channel.send(`I could not join the voice channel: ${error}`);
    }
  }
  else {
    serverQueue.songs.push(song);
    if (playlist) return undefined;
    else return msg.channel.send(`✅ **${song.title}** has been added to the queue!`);
  }
  return undefined;
}
 
function play(guild, song) {
  const serverQueue = queue.get(guild.id);
 
  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
 
  const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
    .on('end', reason => {
      if (reason === 'Stream is not generating quickly enough.') return;
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on('error', error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
      let embed = new RichEmbed()
    .setTitle('discord.js 🎶')
    .setDescription(`**Song name ${song.title}**`)
    .setThumbnail(`https://img.youtube.com/vi/${song.id}/0.jpg`) 
    .addField('Song:', `[${song.title}](${song.url})`, true)
    .addField('Shortcut of video:', `${song.id}`, true)
    .addField('volume:', `${dispatcher.volume}`, true)  
    .addField('time:', `${song.time}`, true)
    .setColor('RANDOM')   
    .setFooter('discord.js')
    
  serverQueue.textChannel.send({embed : embed});
}
client.login(TOKEN)