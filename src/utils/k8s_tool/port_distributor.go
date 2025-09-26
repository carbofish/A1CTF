package k8stool

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"

	"github.com/go-redis/redis"
)

type PortRange struct {
	NodeName string
	Start    int
	End      int
}

type Allocator struct {
	rdb    *redis.Client
	ctx    context.Context
	prefix string
	owner  string

	mu       sync.Mutex
	cands    []int
	occupied map[int]bool
	nextIdx  int
}

func NewAllocator(r *redis.Client, prefix, owner string, ranges []PortRange) *Allocator {
	return &Allocator{
		rdb:      r,
		ctx:      context.Background(),
		prefix:   prefix,
		owner:    owner,
		cands:    flatten(ranges),
		occupied: make(map[int]bool),
	}
}

func (a *Allocator) Get() (int, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	n := len(a.cands)
	if n == 0 {
		return 0, errors.New("no ports")
	}

	for tried := 0; tried < n; tried++ {
		idx := (a.nextIdx + tried) % n
		p := a.cands[idx]

		if a.occupied[p] {
			continue
		}

		key := a.redisKey(p)
		ok, err := a.rdb.SetNX(key, a.owner, 0).Result()
		if err != nil {
			return 0, err
		}
		if ok {
			a.occupied[p] = true
			a.nextIdx = (idx + 1) % n
			return p, nil
		}

		a.occupied[p] = true
	}

	return 0, errors.New("no free port")
}

func (a *Allocator) Release(port int) error {
	a.mu.Lock()
	defer a.mu.Unlock()

	key := a.redisKey(port)
	const lua = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end`
	_, err := a.rdb.Eval(lua, []string{key}, a.owner).Result()

	delete(a.occupied, port)
	return err
}

func (a *Allocator) redisKey(p int) string {
	return fmt.Sprintf("%s:%d", a.prefix, p)
}

func flatten(ranges []PortRange) []int {
	set := map[int]struct{}{}
	for _, rg := range ranges {
		for p := rg.Start; p <= rg.End; p++ {
			set[p] = struct{}{}
		}
	}
	out := make([]int, 0, len(set))
	for p := range set {
		out = append(out, p)
	}
	sort.Ints(out)
	return out
}
