import { templateSanity } from '../templateSanity';

// EtsySync Pro ships the standard @wix/design-system dependency set (matching the
// other dashboard templates). A cold install of that set can take ~55-60s on a
// slower machine, so give the install step extra headroom to avoid flaking at the
// default 60s timeout boundary. Other steps keep the default 60s.
templateSanity('etsysync-pro', { installTimeout: 150_000 });
