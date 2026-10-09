---
title: 'The Burrows Wheeler Transform: Shuffling a String So It Compresses Itself'
description: 'How rotating and sorting a string produces a rearrangement that clusters its letters together, reverses perfectly, and quietly underpins bzip2 and genome aligners like bowtie and bwa.'
date: 2026-07-29
tags: ['algorithms', 'combinatorics', 'bioinformatics', 'compression']
image: './bwt_matrix.png'
pinned: false
---

Okay so I used to think compression tricks worked by finding literal repeats. Like, a run of the same byte, or a chunk you've seen earlier in the file, and boom, compressed. Simple, right? ^\_^

Well the Burrows Wheeler Transform said "not today" and did something completely different. It doesn't compress anything on its own! It just rearranges a string's letters into a new string that's way easier for something else to squish down afterward, and the wild part is you can reverse it perfectly. No information lost. Magic trick but it's just math :3

It's what's living inside `bzip2`. It's also why two major DNA aligners are named `bowtie` and `bwa`, both leaning on this transform to search across genomes like it's nbd.

## Rotate, sort, read a column

Take the word `banana`, add an end marker `$` on it that's defined to sort smaller than literally anything else, and write out every single rotation of it:

```
banana$   anana$b   nana$ba   ana$ban
na$bana   a$banan   $banana
```

Now sort them alphabetically, ezpz:

```
$banana
a$banan
ana$ban
anana$b
banana$
na$bana
nana$ba
```

Now just read straight down that very last column: `annb$aa`. That's how the transform works :p that's genuinely it, the whole trick.

```python
def bwt_encode(s):
    s = s + "$"
    rotations = sorted(s[i:] + s[:i] for i in range(len(s)))
    return "".join(row[-1] for row in rotations)

bwt_encode("banana")       # 'annb$aa'
bwt_encode("mississippi")  # 'ipssm$pissii'
bwt_encode("coconut")      # 't$ooccun'
```

## Why letters cluster

Here's the cool bit ^\-^ every row starting with `o` in `coconut` has, one column to its left, whatever letter used to sit right before that `o`. Since `c` always comes before `o` in this word, all the `co...` rows sort together, and so their last column letters bunch up too, all `c`. You can literally see it above: `oo` sits right next to `cc` like they're holding hands.

Wanna break it? Try `icoconut` versus `ucoconut` and watch how much less tidy the `o`'s group up when you mess with the local repetition. Chaos ensues (a little).

## What the `$` is for

Little symbol, big job. Without it you could technically still rebuild the sorted matrix from the BWT string, but you wouldn't have a clue which row was the "real" original versus just another rotation of it, since they'd all look equally legit. By forcing `$` to always sort smaller than everything else, it's guaranteed to land in row 0, and row 0 is always the original string with the marker politely rotated back to the end where it belongs.

## Decoding without redoing the sort

This part felt like a cheat code the first time I got it working :p. Prepend the BWT string onto an empty table, sort it, and congrats, you've recovered column 1. Do it again, prepend then sort, and now you've got columns 1 and 2. Just keep repeating until the table's full. Whichever row ends in `$` is your answer, as easy as that.

```python
def bwt_decode(bwt):
    n = len(bwt)
    table = [""] * n
    for _ in range(n):
        table = sorted(bwt[i] + table[i] for i in range(n))
    return next(row[:-1] for row in table if row.endswith("$"))

bwt_decode("annb$aa")          # 'banana'
bwt_decode("ipssm$pissii")     # 'mississippi'
```

## Last to first mapping, and searching with it

Okay here's where it gets extra spicy. Number the repeated letters by occurrence: `banana` becomes `b a0 n0 a1 n1 a2`. Turns out the `a`'s show up in the exact same relative order down the first column as they do down the last. That's the LF mapping, and it's the reason the BWT isn't just reversible, it's actually searchable too ^\_^

Doing it by hand: to find `an` inside `banana`, first find the rows starting with `n` (the last letter of our pattern) in column 1. There's two of them. Their last column letters are both `a`. Hop over to the two rows in column 1 that correspond to those specific `a`'s. Both of those rows now read `an...`. Two matches found, and we never even scanned the original string once. Kinda broke my mind the first time I ssaw it in action

Here's the real deal version, using rank tables (`Occ`) instead of hand hopping row by row:

```python
from collections import Counter

def bwt_search(s, pattern):
    s = s + "$"
    n = len(s)
    sa = sorted(range(n), key=lambda i: s[i:])   # suffix array
    last_col = [s[i - 1] for i in sa]             # BWT
    first_col = sorted(last_col)

    counts = Counter(first_col)
    chars = sorted(counts)
    C, total = {}, 0                              # C[c] = # chars smaller than c
    for c in chars:
        C[c] = total
        total += counts[c]

    occ = {c: [0] * (n + 1) for c in chars}        # Occ[c][i] = count of c in last_col[:i]
    for i, ch in enumerate(last_col):
        for c in chars:
            occ[c][i + 1] = occ[c][i] + (ch == c)

    lo, hi = 0, n
    for ch in reversed(pattern):
        if ch not in C:
            return []
        lo = C[ch] + occ[ch][lo]
        hi = C[ch] + occ[ch][hi]
        if lo >= hi:
            return []
    return sorted(sa[i] for i in range(lo, hi))

bwt_search("banana", "an")         # [1, 3]
bwt_search("mississippi", "issi")  # [1, 4]
bwt_search("coconut", "co")        # [0, 2]
```

Decoding is honestly the same trick, just aimed at one single target: hop between the last and first columns hunting for `$`, and the original string just falls out of it in reverse. Neat huh :3

## Where the real engineering lives

Building the matrix by literally writing out every rotation costs about $O(n^2 \log n)$. Totally fine for `banana`. Extremely not fine for a 3 billion base genome lol. So in practice you build a suffix array instead, which gets you the exact same sorted order without ever having to materialize a single full rotation:

```python
def bwt_from_suffix_array(s):
    s = s + "$"
    sa = sorted(range(len(s)), key=lambda i: s[i:])
    return "".join(s[i - 1] for i in sa)

bwt_from_suffix_array("banana")  # 'annb$aa'
```

Stack an FM index on top of that suffix array (basically just the `C` and `Occ` tables from the search function above, precomputed once and ready to go), and suddenly the LF mapping search runs in near constant time per step instead of scanning around like a lost puppy. That combo right there is literally what `bowtie` and `bwa` run on under the hood ^\_^.

## Quick answers to things I wondered

**Why does clustering help compression if BWT itself compresses nothing?** Whatever algorithm runs next, move to front, then run length, then entropy coding in `bzip2`'s case, does its best work on repeated adjacent symbols. BWT's whole job is just producing those runs for it. It doesn't shrink a single byte itself, it just sets the table :p

**Text only, or DNA too?** Neither specifically! It works on any sequence over an orderable alphabet, which is exactly why it shows up in both worlds.

**What about random input?** Reverses just fine, but clusters terribly. No local repetition means there's nothing for the sort to preserve. Sad but expected.

## Summary

Rotate a string every way you can, sort the rotations, read the last column. That's the whole BWT, and it clusters identical letters together wherever the original had local repetition, without losing a single bit of info. Reversing it just means repeatedly prepending the BWT string onto a growing table and re sorting until the `$`-terminated row shows up. The last to first mapping turns that same matrix into a full blown search structure, and pairing it with a suffix array plus an FM index is what lets `bowtie` and `bwa` align reads against an entire genome instead of scanning through it byte by byte. Pretty wild for something that started as just rotating a word about a fruit ^\_^
