import type { ImageSourcePropType } from 'react-native';
import { photoCredits } from './photo-credits';
import type { Trek } from './treks';
export type TrekPhoto = { image: ImageSourcePropType; label: string; author: string; source: string; license: string; licenseURL: string };
const extras: Record<string, TrekPhoto[]> = {
"mardi-himal": [
{ image: require("../../assets/mardi-camp.jpg"), "label": "High Camp morning", "author": "Anusandhan Pokhrel", "source": "https://commons.wikimedia.org/wiki/File:A_musing_morning_at_High_Camp.jpg", "license": "CC BY-SA 4.0", "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0" },
{ image: require("../../assets/mardi-trail.jpg"), "label": "Mardi trail and Machhapuchhre", "author": "Dibesh man singh shrestha", "source": "https://commons.wikimedia.org/wiki/File:A_view_of_mardi_trail_with_Mount_Fishtail(Machhapuchchhre)_in_the_background.jpg", "license": "CC BY-SA 4.0", "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0" },
],
"annapurna-base-camp": [
{ image: require("../../assets/annapurna-sanctuary.jpg"), "label": "Annapurna Sanctuary", "author": "Josep M. Gracia", "source": "https://commons.wikimedia.org/wiki/File:ABC_-_South_face_of_Annapurna_I_from_Annapurna_Base_Camp,_Nepal,_2016.jpg", "license": "CC BY-SA 4.0", "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0" },
{ image: require("../../assets/annapurna-trail.jpg"), "label": "Trail toward Machhapuchhre", "author": "Josep M. Gracia", "source": "https://commons.wikimedia.org/wiki/File:ABC_-_Trail_toward_Machhapuchchhre_Base_Camp,_Nepal,_2016.jpg", "license": "CC BY-SA 4.0", "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0" },
],
"langtang-valley": [
{ image: require("../../assets/langtang-valley-view.jpg"), "label": "Along the Langtang Valley", "author": "Rsh2020", "source": "https://commons.wikimedia.org/wiki/File:Along_the_Langtang_Valley.jpg", "license": "CC BY-SA 4.0", "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0" },
{ image: require("../../assets/langtang-national-park.jpg"), "label": "Langtang National Park", "author": "Vincent Granouillac", "source": "https://commons.wikimedia.org/wiki/File:2017_Parc_National_de_Langtang,_N%C3%A9pal_2017.jpg", "license": "CC BY-SA 4.0", "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0" },
],
"everest-base-camp": [
{ image: require("../../assets/everest-camp.jpg"), "label": "Base camp scene", "author": "Aman Yadaav123", "source": "https://commons.wikimedia.org/wiki/File:Basecamp_of_mount_Everest.jpg", "license": "CC BY-SA 4.0", "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0" },
{ image: require("../../assets/everest-valley.jpg"), "label": "Everest base camp", "author": "Mawj Aldarraji", "source": "https://commons.wikimedia.org/wiki/File:Everest_BC.jpg", "license": "CC BY-SA 4.0", "licenseURL": "https://creativecommons.org/licenses/by-sa/4.0" },
],
};
export function galleryForTrek(trek: Trek): TrekPhoto[] { const credit = photoCredits[trek.id]; return [{ image: trek.image, label: trek.name, author: credit?.author ?? "", source: credit?.source ?? "", license: `CC BY-SA ${credit?.license ?? "4.0"}`, licenseURL: `https://creativecommons.org/licenses/by-sa/${credit?.license ?? "4.0"}/` }, ...(extras[trek.id] ?? [])]; }
