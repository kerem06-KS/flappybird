import numpy as np, subprocess, os
SR=44100; OUT='/tmp/audio/out'; os.makedirs(OUT,exist_ok=True)

def note(n):  # MIDI -> Hz
    return 440.0*2**((n-69)/12)

def osc(kind, f, dur, duty=0.5):
    x=np.linspace(0,dur,int(SR*dur),endpoint=False); ph=(f*x)%1.0
    if kind=='sq':  return np.where(ph<duty,1.0,-1.0)
    if kind=='tri': return 2*np.abs(2*(ph-0.5))-1
    if kind=='saw': return 2*ph-1
    return np.sin(2*np.pi*f*x)

def pluck(f, dur, kind='sq', duty=0.5, a=0.004, decay=6.0):
    s=osc(kind,f,dur,duty); n=len(s)
    e=np.exp(-np.linspace(0,decay,n))
    ai=int(a*SR); e[:ai]*=np.linspace(0,1,ai)
    return s*e

def pad(f, dur, kind='tri'):
    s=osc(kind,f,dur); n=len(s)
    e=np.ones(n); ai=int(0.12*SR); ri=int(0.25*SR)
    e[:ai]=np.linspace(0,1,ai); e[-ri:]=np.linspace(1,0,ri)
    return s*e

def place(track, sig, at):
    i=int(at*SR); end=min(len(track), i+len(sig))
    track[i:end]+=sig[:end-i]

def kick(dur=0.16):
    n=int(SR*dur); x=np.linspace(0,dur,n,endpoint=False)
    return np.sin(2*np.pi*np.cumsum(np.linspace(140,45,n))/SR)*np.exp(-np.linspace(0,10,n))

def hat(dur=0.045):
    n=int(SR*dur)
    return np.random.uniform(-1,1,n)*np.exp(-np.linspace(0,28,n))*0.35

def save(name, sig, gain=0.72, loop_len=None):
    if loop_len is not None:
        # Trim to exactly one musical loop and wrap the overhanging note tails
        # back onto the start, so decaying notes ring across the loop point.
        # Simply padding the end with room for tails left a silent gap that made
        # the loop audibly restart.
        n=int(loop_len*SR)
        body=sig[:n].copy()
        overflow=sig[n:]
        if len(overflow):
            k=min(len(overflow), n)
            body[:k]+=overflow[:k]
        sig=body
    sig=sig/(np.max(np.abs(sig))+1e-9)*gain
    pcm=(sig*32767).astype(np.int16)
    raw=f'{OUT}/{name}.raw'; pcm.tofile(raw)
    mp3=f'{OUT}/{name}.mp3'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','s16le','-ar',str(SR),'-ac','1','-i',raw,
                    '-codec:a','libmp3lame','-b:a','160k',mp3],check=True)
    os.remove(raw)
    print(f'  {name}.mp3  {len(sig)/SR:5.1f}s  {os.path.getsize(mp3)/1024:6.1f} KB')

print('Generating music:')

# ============ HOME: bright, relaxed, welcoming loop (C major, 100bpm) ============
bpm=100; beat=60/bpm; bars=8; dur=bars*4*beat+1.0
home=np.zeros(int(SR*dur))
chords=[[60,64,67],[57,60,64],[65,69,72],[67,71,74]]  # C Am F G
mel=[72,74,76,79,76,74,72,69, 71,72,74,76,74,72,71,67]
for bar in range(bars):
    t0=bar*4*beat; ch=chords[bar%4]
    for n in ch: place(home, pad(note(n),4*beat,'tri')*0.16, t0)
    place(home, pluck(note(ch[0]-12),beat*1.6,'sq',0.5,decay=4)*0.22, t0)
    place(home, pluck(note(ch[0]-12),beat*1.2,'sq',0.5,decay=5)*0.16, t0+2*beat)
    for i in range(4):
        m=mel[(bar*2+ (i//2))%len(mel)] if i%2==0 else mel[(bar*2+i)%len(mel)]
        place(home, pluck(note(m),beat*0.85,'sq',0.25,decay=5.5)*0.20, t0+i*beat)
save('music_home', home, loop_len=bars*4*beat)

# ============ GAMEPLAY DAY: driving, upbeat chiptune (A minor->C, 132bpm) ============
bpm=132; beat=60/bpm; bars=8; dur=bars*4*beat+1.0
day=np.zeros(int(SR*dur))
bass=[45,45,52,52,50,50,43,43]
lead=[69,72,76,72,74,72,69,67, 69,72,76,79,76,74,72,69]
dchord=[[57,60,64],[57,60,64],[64,67,71],[64,67,71],[62,65,69],[62,65,69],[55,59,62],[55,59,62]]
for bar in range(bars):
    t0=bar*4*beat
    # Quiet sustained pad. Without it the last eighth note decays out and leaves
    # a ~100ms hole at the loop point, which reads as a hiccup on a fast track.
    for n in dchord[bar]: place(day, pad(note(n),4*beat,'tri')*0.085, t0)
    for i in range(8):
        place(day, pluck(note(bass[bar]),beat*0.42,'sq',0.5,decay=9)*0.30, t0+i*beat*0.5)
    for i in range(8):
        n=lead[(bar*2+i)%len(lead)]
        place(day, pluck(note(n),beat*0.46,'sq',0.25,decay=7)*0.19, t0+i*beat*0.5)
    for i in range(4): place(day, kick()*0.34, t0+i*beat)
    for i in range(8):
        if i%2: place(day, hat()*0.5, t0+i*beat*0.5)
save('music_day', day, loop_len=bars*4*beat)

# ============ GAMEPLAY NIGHT: same energy, darker/cooler palette (110bpm) ============
bpm=110; beat=60/bpm; bars=8; dur=bars*4*beat+1.0
night=np.zeros(int(SR*dur))
nbass=[45,45,48,48,43,43,41,41]
nlead=[69,71,72,76,72,71,69,67, 64,67,69,72,69,67,64,62]
nchord=[[57,60,64],[57,60,64],[60,63,67],[60,63,67],[55,58,62],[55,58,62],[53,57,60],[53,57,60]]
for bar in range(bars):
    t0=bar*4*beat
    for n in nchord[bar]: place(night, pad(note(n),4*beat,'tri')*0.15, t0)
    for i in range(4):
        place(night, pluck(note(nbass[bar]),beat*0.8,'tri',decay=5)*0.30, t0+i*beat)
    for i in range(8):
        n=nlead[(bar*2+i)%len(nlead)]
        place(night, pluck(note(n),beat*0.7,'tri',decay=4.5)*0.17, t0+i*beat*0.5)
    for i in range(2): place(night, kick()*0.22, t0+i*2*beat)
save('music_night', night, loop_len=bars*4*beat)
