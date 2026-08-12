import numpy as np, subprocess, os
SR = 44100
OUT = '/tmp/audio/out'
os.makedirs(OUT, exist_ok=True)

def t(dur): return np.linspace(0, dur, int(SR*dur), endpoint=False)

def env(sig, a=0.005, d=0.05, s=0.5, r=0.2, sus_level=0.6):
    n = len(sig); e = np.ones(n)
    ai, di, ri = int(a*SR), int(d*SR), int(r*SR)
    ai = min(ai, n); e[:ai] = np.linspace(0,1,ai)
    di = min(di, max(0,n-ai)); e[ai:ai+di] = np.linspace(1,sus_level,di)
    e[ai+di:n-ri] = sus_level
    ri = min(ri, max(0,n-ai-di)); e[n-ri:] = np.linspace(e[n-ri-1] if n-ri>0 else sus_level, 0, ri)
    return sig*e

def sq(freq, dur, duty=0.5):
    x = t(dur)
    ph = (freq*x) % 1.0 if np.isscalar(freq) else (np.cumsum(freq)/SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)

def tri(freq, dur):
    x = t(dur)
    ph = (freq*x) % 1.0 if np.isscalar(freq) else (np.cumsum(freq)/SR) % 1.0
    return 2*np.abs(2*(ph-0.5))-1

def sine(freq, dur):
    x = t(dur)
    if np.isscalar(freq): return np.sin(2*np.pi*freq*x)
    return np.sin(2*np.pi*np.cumsum(freq)/SR)

def noise(dur): return np.random.uniform(-1,1,int(SR*dur))

def lowpass(sig, cutoff):
    # simple one-pole
    a = np.exp(-2*np.pi*cutoff/SR); y = np.zeros_like(sig); prev=0
    for i,v in enumerate(sig):
        prev = (1-a)*v + a*prev; y[i]=prev
    return y

def save(name, sig, gain=0.85):
    sig = sig/ (np.max(np.abs(sig))+1e-9) * gain
    # Asymmetric fades: a long fade-in flattens percussive attacks (it was
    # wiping out the click's transient entirely), so keep the in-fade to a few
    # samples and only use a longer out-fade to avoid an end-of-file pop.
    fi = min(24, len(sig)//20)
    fo = min(400, len(sig)//8)
    sig[:fi] *= np.linspace(0,1,fi); sig[-fo:] *= np.linspace(1,0,fo)
    pcm = (sig*32767).astype(np.int16)
    raw = f'{OUT}/{name}.raw'; pcm.tofile(raw)
    mp3 = f'{OUT}/{name}.mp3'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','s16le','-ar',str(SR),'-ac','1',
                    '-i',raw,'-codec:a','libmp3lame','-b:a','128k',mp3], check=True)
    os.remove(raw)
    print(f'  {name}.mp3  {len(sig)/SR:.2f}s  {os.path.getsize(mp3)} bytes')

print('Generating sound effects:')

# --- COLLISION: hard percussive thud + splintery noise burst ---
d=0.45
thud = sine(np.linspace(180,45,int(SR*d)), d) * np.exp(-np.linspace(0,9,int(SR*d)))
crack = lowpass(noise(d), 1800) * np.exp(-np.linspace(0,16,int(SR*d)))
body = sq(np.linspace(150,60,int(SR*d)), d, 0.35) * np.exp(-np.linspace(0,12,int(SR*d))) * 0.5
save('collision', thud*1.0 + crack*0.55 + body*0.4)

# --- GAME OVER: descending minor arpeggio, sad chiptune ---
notes=[('A4',440),('F4',349.23),('D4',293.66),('A3',220)]
seg=0.26; go=np.array([])
for i,(nm,f) in enumerate(notes):
    dur = seg if i<3 else 0.85
    # The sub-octave triangle was mixed equally with the square, which made the
    # perceived fundamental drop an octave below the intended note. Keep it as
    # warmth underneath rather than an equal voice.
    v = sq(f,dur,0.5)*0.72 + tri(f/2,dur)*0.28
    v = env(v, a=0.008, d=0.06, r=dur*0.55, sus_level=0.55)
    go=np.concatenate([go,v])
vib = tri(np.full(int(SR*0.85),220.0),0.85)*0.25*np.exp(-np.linspace(0,3,int(SR*0.85)))
go[-len(vib):] += vib
save('game_over', go)

# --- SCORE CARD: upward whoosh + pop ---
# A fixed lowpass gives a whoosh with static brightness, which reads as falling
# once the amplitude decays. Sweeping the cutoff upward is what makes it rise.
def sweep_lowpass(sig, c0, c1):
    cut = np.linspace(c0, c1, len(sig))
    a = np.exp(-2*np.pi*cut/SR)
    y = np.zeros_like(sig); prev = 0.0
    for i, v in enumerate(sig):
        prev = (1-a[i])*v + a[i]*prev; y[i] = prev
    return y

d=0.5
sweep = sweep_lowpass(noise(d), 260, 5200) * np.linspace(0.25,1.0,int(SR*d))**1.5
rise = sine(np.linspace(300,1150,int(SR*d)), d) * np.linspace(0,1,int(SR*d))**2 * 0.45
pop_d=0.13
pop = sine(np.linspace(900,1500,int(SR*pop_d)), pop_d)*np.exp(-np.linspace(0,14,int(SR*pop_d)))
card = np.concatenate([sweep+rise, np.zeros(int(SR*0.02))])
card[-len(pop):] += pop*0.9
save('score_card', card)

# --- UI CLICK: short, subtle, soft tick ---
d=0.055
click = sq(np.linspace(1500,760,int(SR*d)), d, 0.5)*0.55 + sine(np.linspace(2200,1100,int(SR*d)), d)*0.45
click *= np.exp(-np.linspace(0,30,int(SR*d)))
click = lowpass(click, 5200)
save('ui_click', click, gain=0.5)
