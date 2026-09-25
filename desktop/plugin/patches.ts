// SPDX-License-Identifier: GPL-3.0-or-later
// These patches target component boundaries in the public Discord UI bundle.
// No network endpoints, credentials, authentication code or membership mutations.
/* eslint-disable no-useless-escape -- Vencord expands its identifier token. */
export const focusPatches = [{
    find: '("guildsnav")',
    replacement: [{
        match: /switch\((\i)\.type\){.+?default:return null}/,
        replace: 'return $self.renderGuild($1,focusNode=>{$1=focusNode;$&});'
    }, {
        match: /\(0,\i\.jsx\)\((\i\.\i),({\.\.\.\i,ref:\i,items:\i,isUnread:\i,textUnread:)/,
        // Keep the leading parentheses: the original call can immediately follow `return`.
        replace: '($self.renderUnreadIndicator)($1,$2'
    }]
}, {
    // Do not mount the friends activity feed, its subscriptions or refresh hooks.
    find: '"refresh-active-now"',
    replacement: {
        match: /(function \i\(\){)(?=let{analyticsLocations:\i}=\(0,\i\.\i\)\(\i\.\i\.ACTIVE_NOW_COLUMN\))/,
        replace: '$1return null;'
    }
}, {
    find: '"quest-bar-container"',
    replacement: {
        match: /(QuestBar|default):\(\)=>(\i)/g,
        replace: '$1:()=>$self.questComponent($2)'
    }
}, {
    // Let search, threads, member lists and moderation keep their native sidebars.
    find: '"ChannelSectionStore"',
    replacement: [{
        match: /\i&&\i\(\)\?(\i\.\i)\.FRIENDS:\i&&\i\?\1\.PROFILE:/,
        replace: 'false?$1.FRIENDS:false?$1.PROFILE:'
    }, {
        match: /isFriendsSidebarAvailable\(\){return \i}/,
        replace: 'isFriendsSidebarAvailable(){return false;}'
    }]
}, {
    // All return paths of the actual quest-dock visibility hook, including completed quests.
    find: '"quest_bar_visible"',
    replacement: {
        match: /return{isQuestBarVisible:/g,
        replace: 'return{isQuestBarVisible:!$self.hidePromotions()&&'
    }
}, {
    // Stop the dock's ad refresh timer at its UI hook. Other placements are untouched.
    find: '"useQuestForAdPlacement"',
    replacement: {
        match: /(\i\.useEffect\)\(\(\)=>{)(?=null!=\i\.current&&clearInterval)/,
        replace: '$1if($self.hidePromotions()&&arguments[0]===1)return;'
    }
}, {
    // Filter before the native virtual grid calculates rows and category counts.
    // Preserve Discord's channel/intention permission checks, including reactions.
    find: '"useEmojiGrid"',
    replacement: {
        match: /(function \i\((\i),(\i)\){)(?=let \i=new Map,\i=\i\.has\(\3\.sectionId\),\[\i,\i\]=\i\(\)\.partition\(\2,\i=>{let \i=(\i\.\i)\.isEmojiDisabled\({emoji:\i,channel:(\i),intention:(\i)}\))/,
        replace: '$1$2=$2.filter(focusEmoji=>$4.getEmojiUnavailableReason({emoji:focusEmoji,channel:$5,intention:$6})==null);if(!$2.length)return;$3={...$3,isNitroLocked:false};'
    }
}, {
    find: '"UserProfileModalV2Tabs"',
    group: true,
    replacement: [{
        // Register the existing activity renderer; keep its live cards and native actions.
        match: /function (\i)\((\i)\){let{user:\i,currentUser:\i,displayProfile:\i,guildId:\i,channelId:\i,onClose:\i}=\2,{live:/,
        replace: '$self.ProfileActivity=$1;$&'
    }, {
        match: /(\i)=(\i)\.length>0;return (\i)\|\|\1\|\|!(\i)\?/,
        replace: '$1=!arguments[0].focusCurrentOnly&&$2.length>0;if(arguments[0].focusCurrentOnly&&!$3)return null;return $3||$1||!$4?'
    }, {
        // An own/private profile may have no remaining mutual tabs.
        match: /(\.useState\(\(\)=>\(\i\.find\(\i=>\i\.section===\i\)\?\?\i\[0\]\))\.section/,
        replace: '$1?.section'
    }, {
        match: /((\i)=\i\.find\(\i=>\i\.section===\i\)\?\?\i\[0\];)return \2\.section/,
        replace: '$1if(!$2)return null;return $2.section'
    }]
}, {
    find: 'parentComponent:"UserProfileModalV2"',
    group: true,
    replacement: [{
        match: /(className:\i\.profileButtons,children:\(0,\i\.jsx\)\(\i,{[^{}]+}\)}\)),/,
        replace: '$1,arguments[0].focusEditor,$self.renderProfileActivity(arguments[0]),'
    }, {
        match: /items:(\i),initialSection:/,
        replace: 'items:$self.profileTabs($1),initialSection:'
    }, {
        // Move the native editing controls into the modal, keeping all callbacks,
        // pending changes, guild selection and native sub-editors intact.
        match: /(\i)&&\i\(\(\i,\i\)=>\i\?\(0,(\i)\.jsx\)\((\i),{className:\i\(\)\(\i\.editingPanel,{\[\i\.isExpanded\]:\i}\),(selectedGuildId:\i,originGuildId:\i,onSelectGuildId:\i,onClose:\i,collapseButtonRef:\i,isLoading:\i,isEditingDisabled:\i)}\):null\),(.+?className:\i\.profileContentColumns,children:\[\(0,\i\.jsx\)\(\i,{)/,
        replace: '$5focusEditor:$1&&(0,$2.jsx)($3,{className:"focus-profile-editor-controls",$4}),'
    }]
}];
