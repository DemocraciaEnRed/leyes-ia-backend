
// import Gradient SDK
import { Gradient } from '@digitalocean/gradient';

export const client = new Gradient({
    accessToken: process.env.DIGITALOCEAN_PERSONAL_ACCESS_TOKEN,
});