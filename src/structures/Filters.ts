import { Player } from "./Player";

export type AudioOutputs = "mono" | "stereo" | "left" | "right";

export interface FilterManager {
    player: Player;
}

export class FilterManager {
    public equalizerBands: EQBand[] = [];
    public filterUpdatedState: number = 0;
    public filters: PlayerFilters = {
        volume: false,
        vaporwave: false,
        custom: false,
        nightcore: false,
        echo: false,
        reverb: false,
        rotation: false,
        karaoke: false,
        tremolo: false,
        vibrato: false,
        lowPass: false,
        audioOutput: "stereo",
    }
    public data: LavalinkFilterData = {
        lowPass: {
            smoothing: 0
        },
        karaoke: {
            level: 0,
            monoLevel: 0,
            filterBand: 0,
            filterWidth: 0
        },
        timescale: {
            speed: 1, // 0 = x
            pitch: 1, // 0 = x
            rate: 1 // 0 = x
        },
        echo: {
            delay: 0,
            decay: 0
        },
        reverb: {
            delay: 0,
            decay: 0
        },
        rotation: {
            rotationHz: 0
        },
        tremolo: {
            frequency: 0, // 0 < x
            depth: 0// 0 < x = 1
        },
        vibrato: {
            frequency: 0, // 0 < x = 14
            depth: 0     // 0 < x = 1
        },
        channelMix: audioOutputsData.stereo,
        /*distortion: {
            sinOffset: 0,
            sinScale: 1,
            cosOffset: 0,
            cosScale: 1,
            tanOffset: 0,
            tanScale: 1,
            offset: 0,
            scale: 1
        }*/
    }
    constructor(player: Player) {
        this.player = player;
    }
    // function to update all filters at ONCE (and eqs)
    async applyPlayerFilters() {
        const sendData = { ...this.data } as LavalinkFilterData & { equalizer: EQBand[] };

        if (!this.filters.volume) delete sendData.volume;
        if (!this.filters.tremolo) delete sendData.tremolo;
        if (!this.filters.vibrato) delete sendData.vibrato;
        //if(!this.filters.karaoke) delete sendData.karaoke;
        if (!this.filters.echo) delete sendData.echo;
        if (!this.filters.reverb) delete sendData.reverb;
        if (!this.filters.lowPass) delete sendData.lowPass;
        if (!this.filters.karaoke) delete sendData.karaoke;
        //if(!this.filters.rotating) delete sendData.rotating;
        if (this.filters.audioOutput === "stereo") delete sendData.channelMix;

        if (!this.player.node.sessionId) throw new Error("The Lavalink-Node is either not ready or not up to date");

        sendData.equalizer = [...this.equalizerBands];
        for (const key of [...Object.keys(sendData)]) {
            // delete disabled filters
            if (this.player.node.info && !this.player.node.info?.filters?.includes?.(key)) delete sendData[key];
        }

        const now = performance.now();
        await this.player.node.updatePlayer({
            guildId: this.player.guildId,
            playerOptions: {
                filters: sendData,
            }
        })
        this.player.ping = Math.round((performance.now() - now) / 10) / 100;
        if (this.player.options.instaUpdateFiltersFix === true) this.filterUpdatedState = 1;
        return;
    }

    /**
     * Checks if the filters are correctly stated (active / not-active)
     * @param oldFilterTimescale 
     * @returns 
     */
    checkFiltersState(oldFilterTimescale?: Partial<TimescaleFilter>) {
        this.filters.rotation = this.data.rotation.rotationHz !== 0;
        this.filters.vibrato = this.data.vibrato.frequency !== 0 || this.data.vibrato.depth !== 0;
        this.filters.tremolo = this.data.tremolo.frequency !== 0 || this.data.tremolo.depth !== 0;
        this.filters.echo = this.data.echo.decay !== 0 || this.data.echo.delay !== 0;
        this.filters.reverb = this.data.reverb.decay !== 0 || this.data.reverb.delay !== 0;
        this.filters.lowPass = this.data.lowPass.smoothing !== 0;
        this.filters.karaoke = Object.values(this.data.karaoke).some(v => v !== 0);
        if ((this.filters.nightcore || this.filters.vaporwave) && oldFilterTimescale) {
            if (oldFilterTimescale.pitch !== this.data.timescale.pitch || oldFilterTimescale.rate !== this.data.timescale.rate || oldFilterTimescale.speed !== this.data.timescale.speed) {
                this.filters.custom = Object.values(this.data.timescale).some(v => v !== 1);
                this.filters.nightcore = false;
                this.filters.vaporwave = false;
            }
        }
        return true;
    }

    /**
     * Reset all Filters
     */
    public async resetFilters(): Promise<PlayerFilters> {
        this.filters.echo = false;
        this.filters.reverb = false;
        this.filters.nightcore = false;
        this.filters.lowPass = false;
        this.filters.rotation = false;
        this.filters.tremolo = false;
        this.filters.vibrato = false;
        this.filters.karaoke = false;
        this.filters.karaoke = false;
        this.filters.volume = false;
        this.filters.audioOutput = "stereo";
        // disable all filters
        for (const [key, value] of Object.entries({
            volume: 1,
            lowPass: {
                smoothing: 0
            },
            karaoke: {
                level: 0,
                monoLevel: 0,
                filterBand: 0,
                filterWidth: 0
            },
            timescale: {
                speed: 1, // 0 = x
                pitch: 1, // 0 = x
                rate: 1 // 0 = x
            },
            echo: {
                delay: 0,
                decay: 0
            },
            reverb: {
                delay: 0,
                decay: 0
            },
            rotation: {
                rotationHz: 0
            },
            tremolo: {
                frequency: 2, // 0 < x
                depth: 0.1 // 0 < x = 1
            },
            vibrato: {
                frequency: 2, // 0 < x = 14
                depth: 0.1      // 0 < x = 1
            },
            channelMix: audioOutputsData.stereo,
        })) {
            this.data[key] = value;
        }
        await this.applyPlayerFilters();
        return this.filters;
    }
    /**
     * Set the AudioOutput Filter 
     * @param type 
     */
    public async setAudioOutput(type: AudioOutputs): Promise<AudioOutputs> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("channelMix")) throw new Error("Node#Info#filters does not include the 'channelMix' Filter (Node has it not enable)")
        if (!type || !audioOutputsData[type]) throw "Invalid audio type added, must be 'mono' / 'stereo' / 'left' / 'right'"
        this.data.channelMix = audioOutputsData[type];
        this.filters.audioOutput = type;
        await this.applyPlayerFilters();
        return this.filters.audioOutput;
    }
    /**
     * Set custom filter.timescale#speed . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
     * @param speed 
     * @returns 
     */
    public async setSpeed(speed = 1): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("timescale")) throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)")
        // reset nightcore / vaporwave filter if enabled
        if (this.filters.nightcore || this.filters.vaporwave) {
            this.data.timescale.pitch = 1;
            this.data.timescale.speed = 1;
            this.data.timescale.rate = 1;
            this.filters.nightcore = false;
            this.filters.vaporwave = false;
        }

        this.data.timescale.speed = speed;

        // check if custom filter is active / not
        this.isCustomFilterActive();

        await this.applyPlayerFilters();
        return this.filters.custom;
    }
    /**
     * Set custom filter.timescale#pitch . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
     * @param speed 
     * @returns 
     */
    public async setPitch(pitch = 1): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("timescale")) throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)")
        // reset nightcore / vaporwave filter if enabled
        if (this.filters.nightcore || this.filters.vaporwave) {
            this.data.timescale.pitch = 1;
            this.data.timescale.speed = 1;
            this.data.timescale.rate = 1;
            this.filters.nightcore = false;
            this.filters.vaporwave = false;
        }

        this.data.timescale.pitch = pitch;


        // check if custom filter is active / not
        this.isCustomFilterActive();

        await this.applyPlayerFilters();
        return this.filters.custom;
    }
    /**
     * Set custom filter.timescale#rate . This method disabled both: nightcore & vaporwave. use 1 to reset it to normal
     * @param speed 
     * @returns 
     */
    public async setRate(rate = 1): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("timescale")) throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)")
        // reset nightcore / vaporwave filter if enabled
        if (this.filters.nightcore || this.filters.vaporwave) {
            this.data.timescale.pitch = 1;
            this.data.timescale.speed = 1;
            this.data.timescale.rate = 1;
            this.filters.nightcore = false;
            this.filters.vaporwave = false;
        }

        this.data.timescale.rate = rate;

        // check if custom filter is active / not
        this.isCustomFilterActive();
        await this.applyPlayerFilters();
        return this.filters.custom;
    }
    /**
     * Enabels / Disables the rotation effect, (Optional: provide your Own Data)
     * @param rotationHz
     * @returns 
     */
    public async toggleRotation(rotationHz = 0.2): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("rotation")) throw new Error("Node#Info#filters does not include the 'rotation' Filter (Node has it not enable)")
        this.data.rotation.rotationHz = this.filters.rotation ? 0 : rotationHz;

        this.filters.rotation = !this.filters.rotation;

        return await this.applyPlayerFilters(), this.filters.rotation;
    }

    /**
     * Enabels / Disables the Vibrato effect, (Optional: provide your Own Data)
     * @param frequency
     * @param depth
     * @returns 
     */
    public async toggleVibrato(frequency = 10, depth = 1): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("vibrato")) throw new Error("Node#Info#filters does not include the 'vibrato' Filter (Node has it not enable)")
        this.data.vibrato.frequency = this.filters.vibrato ? 0 : frequency;
        this.data.vibrato.depth = this.filters.vibrato ? 0 : depth;

        this.filters.vibrato = !this.filters.vibrato;
        await this.applyPlayerFilters();
        return this.filters.vibrato;
    }
    /**
     * Enabels / Disables the Tremolo effect, (Optional: provide your Own Data)
     * @param frequency
     * @param depth
     * @returns 
     */
    public async toggleTremolo(frequency = 4, depth = 0.8): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("tremolo")) throw new Error("Node#Info#filters does not include the 'tremolo' Filter (Node has it not enable)")
        this.data.tremolo.frequency = this.filters.tremolo ? 0 : frequency;
        this.data.tremolo.depth = this.filters.tremolo ? 0 : depth;

        this.filters.tremolo = !this.filters.tremolo;
        await this.applyPlayerFilters()
        return this.filters.tremolo;
    }
    /**
     * Enabels / Disables the LowPass effect, (Optional: provide your Own Data)
     * @param smoothing
     * @returns 
     */
    public async toggleLowPass(smoothing = 20): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("lowPass")) throw new Error("Node#Info#filters does not include the 'lowPass' Filter (Node has it not enable)")
        this.data.lowPass.smoothing = this.filters.lowPass ? 0 : smoothing;

        this.filters.lowPass = !this.filters.lowPass;
        await this.applyPlayerFilters();
        return this.filters.lowPass;
    }
    /**
     * Enabels / Disables the Echo effect, IMPORTANT! Only works with the correct Lavalink Plugin installed. (Optional: provide your Own Data)
     * @param delay
     * @param decay
     * @returns 
     */
    public async toggleEcho(delay = 1, decay = 0.5): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("echo")) throw new Error("Node#Info#filters does not include the 'echo' Filter (Node has it not enable aka not installed!)")
        this.data.echo.delay = this.filters.echo ? 0 : delay;
        this.data.echo.decay = this.filters.echo ? 0 : decay;

        this.filters.echo = !this.filters.echo;
        await this.applyPlayerFilters();
        return this.filters.echo;
    }
    /**
     * Enabels / Disables the Echo effect, IMPORTANT! Only works with the correct Lavalink Plugin installed. (Optional: provide your Own Data)
     * @param delay
     * @param decay
     * @returns 
     */
    public async toggleReverb(delay = 1, decay = 0.5): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("reverb")) throw new Error("Node#Info#filters does not include the 'reverb' Filter (Node has it not enable aka not installed!)")
        this.data.reverb.delay = this.filters.reverb ? 0 : delay;
        this.data.reverb.decay = this.filters.reverb ? 0 : decay;

        this.filters.reverb = !this.filters.reverb;
        await this.applyPlayerFilters();
        return this.filters.reverb;
    }
    /**
     * Enables / Disabels a Nightcore-like filter Effect. Disables/Overwrides both: custom and Vaporwave Filter
     * @param speed 
     * @param pitch 
     * @param rate 
     * @returns 
     */
    public async toggleNightcore(speed = 1.289999523162842, pitch = 1.289999523162842, rate = 0.9365999523162842): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("timescale")) throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)")
        this.data.timescale.speed = this.filters.nightcore ? 1 : speed;
        this.data.timescale.pitch = this.filters.nightcore ? 1 : pitch;
        this.data.timescale.rate = this.filters.nightcore ? 1 : rate;

        this.filters.nightcore = !this.filters.nightcore;
        this.filters.vaporwave = false;
        this.filters.custom = false;
        await this.applyPlayerFilters();
        return this.filters.nightcore;
    }
    /**
     * Enables / Disabels a Vaporwave-like filter Effect. Disables/Overwrides both: custom and nightcore Filter
     * @param speed 
     * @param pitch 
     * @param rate 
     * @returns 
     */
    public async toggleVaporwave(speed = 0.8500000238418579, pitch = 0.800000011920929, rate = 1): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("timescale")) throw new Error("Node#Info#filters does not include the 'timescale' Filter (Node has it not enable)")
        this.data.timescale.speed = this.filters.vaporwave ? 1 : speed;
        this.data.timescale.pitch = this.filters.vaporwave ? 1 : pitch;
        this.data.timescale.rate = this.filters.vaporwave ? 1 : rate;

        this.filters.vaporwave = !this.filters.vaporwave;
        this.filters.nightcore = false;
        this.filters.custom = false;
        await this.applyPlayerFilters();
        return this.filters.vaporwave;
    }
    /**
     * Enable / Disables a Karaoke like Filter Effect
     * @param level 
     * @param monoLevel 
     * @param filterBand 
     * @param filterWidth 
     * @returns 
     */
    public async toggleKaraoke(level = 1, monoLevel = 1, filterBand = 220, filterWidth = 100): Promise<boolean> {
        if (this.player.node.info && !this.player.node.info?.filters?.includes("karaoke")) throw new Error("Node#Info#filters does not include the 'karaoke' Filter (Node has it not enable)")

        this.data.karaoke.level = this.filters.karaoke ? 0 : level;
        this.data.karaoke.monoLevel = this.filters.karaoke ? 0 : monoLevel;
        this.data.karaoke.filterBand = this.filters.karaoke ? 0 : filterBand;
        this.data.karaoke.filterWidth = this.filters.karaoke ? 0 : filterWidth;

        this.filters.karaoke = !this.filters.karaoke;
        await this.applyPlayerFilters();
        return this.filters.karaoke;
    }

    /** Function to find out if currently there is a custom timescamle etc. filter applied */
    public isCustomFilterActive(): boolean {
        this.filters.custom = !this.filters.nightcore && !this.filters.vaporwave && Object.values(this.data.timescale).some(d => d !== 1);
        return this.filters.custom;
    }
      /**
     * Sets the players equalizer band on-top of the existing ones.
     * @param bands
     */
    public async setEQ(bands: EQBand|EQBand[]): Promise<this> {
        if (!Array.isArray(bands)) bands = [bands];

        if (!bands.length || !bands.every((band) => JSON.stringify(Object.keys(band).sort()) === '["band","gain"]')) throw new TypeError("Bands must be a non-empty object array containing 'band' and 'gain' properties.");

        for (const { band, gain } of bands) this.equalizerBands[band] = { band, gain };

        if (!this.player.node.sessionId) throw new Error("The Lavalink-Node is either not ready or not up to date");
        
        const now = performance.now();

        await this.player.node.updatePlayer({
            guildId: this.player.guildId,
            playerOptions: {
            filters: { equalizer: this.equalizerBands } }
        });

        this.player.ping = Math.round((performance.now() - now) / 10) / 100;
        
        return this;
    }

    /** Clears the equalizer bands. */
    public async clearEQ(): Promise<this> {
        return this.setEQ(new Array(15).fill(0.0).map((gain, band) => ({ band, gain })));
    }
}

export const audioOutputsData = {
    mono: { // totalLeft: 1, totalRight: 1
        leftToLeft: 0.5, //each channel should in total 0 | 1, 0 === off, 1 === on, 0.5+0.5 === 1
        leftToRight: 0.5,
        rightToLeft: 0.5,
        rightToRight: 0.5,
    },
    stereo: { // totalLeft: 1, totalRight: 1
        leftToLeft: 1,
        leftToRight: 0,
        rightToLeft: 0,
        rightToRight: 1,
    },
    left: { // totalLeft: 1, totalRight: 0
        leftToLeft: 0.5,
        leftToRight: 0,
        rightToLeft: 0.5,
        rightToRight: 0,
    },
    right: { // totalLeft: 0, totalRight: 1
        leftToLeft: 0,
        leftToRight: 0.5,
        rightToLeft: 0,
        rightToRight: 0.5,
    },
}
export interface PlayerFilters {
    /** Sets nightcore to false, and vaporwave to false */
    custom: boolean;
    /** Sets custom to false, and vaporwave to false */
    nightcore: boolean;
    /** Sets custom to false, and nightcore to false */
    vaporwave: boolean;
    /** only with the custom lavalink filter plugin */
    echo: boolean;
    /** only with the custom lavalink filter plugin */
    reverb: boolean;
    rotation: boolean;
    karaoke: boolean;
    tremolo: boolean;
    vibrato: boolean;
    lowPass: boolean;
    /** audio Output (default stereo, mono sounds the fullest and best for not-stereo tracks) */
    audioOutput: AudioOutputs;
    /** Lavalink Volume FILTER (not player Volume, think of it as a gain booster) */
    volume: boolean;
}

export interface EQBand {
    band: number;
    gain: number;
}
export interface KaraokeFilter {
    level?: number;
    monoLevel?: number;
    filterBand?: number;
    filterWidth?: number;
}

export interface TimescaleFilter {
    speed?: number;
    pitch?: number;
    rate?: number;
}

export interface FreqFilter {
    frequency?: number;
    depth?: number;
}

export interface RotationFilter {
    rotationHz?: number;
}

export interface DistortionFilter {
    sinOffset?: number;
    sinScale?: number;
    cosOffset?: number;
    cosScale?: number;
    tanOffset?: number;
    tanScale?: number;
    offset?: number;
    scale?: number;
}

export interface ChannelMixFilter {
    leftToLeft?: number;
    leftToRight?: number;
    rightToLeft?: number;
    rightToRight?: number;
}

export interface LowPassFilter {
    smoothing?: number
}
export interface EchoFilter {
    delay: number
    decay: number
}
export interface ReverbFilter {
    delay: number
    decay: number
}
export interface LavalinkFilterData {
    volume?: number;
    equalizer?: EQBand[];
    karaoke?: KaraokeFilter;
    timescale?: TimescaleFilter;
    tremolo?: FreqFilter;
    vibrato?: FreqFilter;
    rotation?: RotationFilter;
    // rotating: RotationFilter
    distortion?: DistortionFilter;
    channelMix?: ChannelMixFilter;
    lowPass?: LowPassFilter;
    echo: EchoFilter,
    reverb: ReverbFilter,
}