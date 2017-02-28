import { ReducerRegistry, setStateProperty } from '../redux';
import { randomHexString } from '../util';

import {
    DOMINANT_SPEAKER_CHANGED,
    PARTICIPANT_ID_CHANGED,
    PARTICIPANT_JOINED,
    PARTICIPANT_LEFT,
    PARTICIPANT_UPDATED,
    PIN_PARTICIPANT
} from './actionTypes';
import {
    LOCAL_PARTICIPANT_DEFAULT_ID,
    PARTICIPANT_ROLE
} from './constants';

/**
 * Participant object.
 * @typedef {Object} Participant
 * @property {string} id - Participant ID.
 * @property {string} name - Participant name.
 * @property {string} avatar - Path to participant avatar if any.
 * @property {string} role - Participant role.
 * @property {boolean} local - If true, participant is local.
 * @property {boolean} pinned - If true, participant is currently a
 * "PINNED_ENDPOINT".
 * @property {boolean} dominantSpeaker - If this participant is the dominant
 * speaker in the (associated) conference, <tt>true</tt>; otherwise,
 * <tt>false</tt>.
 * @property {string} email - Participant email.
 */

/**
 * These properties should not be bulk assigned when updating a particular
 * @see Participant.
 * @type {string[]}
 */
const PARTICIPANT_PROPS_TO_OMIT_WHEN_UPDATE
    = [ 'dominantSpeaker', 'id', 'local', 'pinned' ];

/**
 * Reducer function for a single participant.
 *
 * @param {Participant|undefined} state - Participant to be modified.
 * @param {Object} action - Action object.
 * @param {string} action.type - Type of action.
 * @param {Participant} action.participant - Information about participant to be
 * added/modified.
 * @param {JitsiConference} action.conference - Conference instance.
 * @private
 * @returns {Participant|undefined}
 */
function _participant(state, action) {
    switch (action.type) {
    case DOMINANT_SPEAKER_CHANGED:
        // Only one dominant speaker is allowed.
        return (
            setStateProperty(
                    state,
                    'dominantSpeaker',
                    state.id === action.participant.id));

    case PARTICIPANT_ID_CHANGED:
        if (state.id === action.oldValue) {
            const id = action.newValue;

            return {
                ...state,
                id
            };
        }
        break;

    case PARTICIPANT_JOINED: {
        const participant = action.participant; // eslint-disable-line no-shadow
        // XXX The situation of not having an ID for a remote participant should
        // not happen. Maybe we should raise an error in this case or generate a
        // random ID.
        const id
            = participant.id
                || (participant.local && LOCAL_PARTICIPANT_DEFAULT_ID);

        // TODO Get these names from config/localized.
        const name
            = participant.name || (participant.local ? 'me' : 'Fellow Jitster');

        // TODO: this should get the avatarId from the localStorage for local
        // participant.
        const avatarId
            = participant.avatarId
                || (participant.local && randomHexString(32));

        return {
            avatarId,
            avatarUrl: participant.avatarUrl,
            email: participant.email,
            id,
            local: participant.local || false,
            name,
            pinned: participant.pinned || false,
            role: participant.role || PARTICIPANT_ROLE.NONE,
            dominantSpeaker: participant.dominantSpeaker || false
        };
    }

    case PARTICIPANT_UPDATED:
        if (state.id === action.participant.id) {
            const newState = { ...state };

            for (const key in action.participant) {
                if (action.participant.hasOwnProperty(key)
                        && PARTICIPANT_PROPS_TO_OMIT_WHEN_UPDATE.indexOf(key)
                            === -1) {
                    newState[key] = action.participant[key];
                }
            }

            return newState;
        }
        break;

    case PIN_PARTICIPANT:
        // Currently, only one pinned participant is allowed.
        return (
            setStateProperty(
                    state,
                    'pinned',
                    state.id === action.participant.id));
    }

    return state;
}

/**
 * Listen for actions which add, remove, or update the set of participants in
 * the conference.
 *
 * @param {Participant[]} state - List of participants to be modified.
 * @param {Object} action - Action object.
 * @param {string} action.type - Type of action.
 * @param {Participant} action.participant - Information about participant to be
 * added/removed/modified.
 * @returns {Participant[]}
 */
ReducerRegistry.register('features/base/participants', (state = [], action) => {
    switch (action.type) {
    case PARTICIPANT_JOINED:
        return [ ...state, _participant(undefined, action) ];

    case PARTICIPANT_LEFT:
        return state.filter(p => p.id !== action.participant.id);

    case DOMINANT_SPEAKER_CHANGED:
    case PARTICIPANT_ID_CHANGED:
    case PARTICIPANT_UPDATED:
    case PIN_PARTICIPANT:
        return state.map(p => _participant(p, action));

    default:
        return state;
    }
});
