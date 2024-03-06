cmd="formbio storage ls"

while true; do
    output=$($cmd | grep "formbio")
    for i in $output; do
        cmd="formbio storage ls $i"
        sub_cmd="$cmd | grep 'formbio' | grep -v -e ':$' | awk '{print \$NF}'"
        eval $sub_cmd
    done 2>&1 | tee -a output.txt
done 