import Article from '../models/article';
import Episode from '../models/episode';
import RSS from '../models/rss';
import Podcast from '../models/podcast';
import { version } from '../../../app/package.json';
import logger from '../utils/logger';
import moment from 'moment';
import config from '../config';

const tooOld = 3 * 60 * 60 * 1000;

// Is the webserver running.... yes no
exports.health = (req, res) => {
	res.status(200).send({ version, healthy: '100%' });
};

// Check the server health more extensively...
exports.test = async (req, res) => {
	let output = { version, code: 200 };
	// verify that we've recently parsed either an article and an episode
	let latestArticle = await Article.findOne({}, {}, { sort: { _id: -1 } });
	let latestEpisode = await Episode.findOne({}, {}, { sort: { _id: -1 } });
	let now = new Date();
	output.mostRecentArticle = moment(latestArticle.createdAt).fromNow();
	output.mostRecentEpisode = moment(latestEpisode.createdAt).fromNow();
	if (
		now - latestArticle.createdAt > tooOld ||
		now - latestEpisode.createdAt > tooOld
	) {
		output.code = 500;
		output.error =
			now - latestArticle.createdAt > tooOld
				? 'The most recent article is too old'
				: 'The most recent episode is too old';
	}
	// check for publications stuck in the isParsing state
	output.rssCurrentlyParsing = await RSS.count({ isParsing: true });
	output.podcastCurrentlyParsing = await Podcast.count({ isParsing: true });
	if (output.rssCurrentlyParsing > 1000) {
		output.code = 500;
		output.error = `There are too many RSS feeds currently parsing ${
			output.rssCurrentlyParsing
		}`;
	}
	if (output.podcastCurrentlyParsing > 500) {
		output.code = 500;
		output.error = `There are too many Podcast feeds currently parsing ${
			output.podcastCurrentlyParsing
		}`;
	}
	// send the response
	res.status(output.code).send(output);
};
